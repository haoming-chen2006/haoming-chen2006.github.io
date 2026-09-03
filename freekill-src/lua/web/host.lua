-- host.lua -- 服务端（权威）VM 的 Lua 侧入口
--
-- 等价于 lua/server/rpc/entry.lua：把引擎装起来，然后只通过
-- InitScheduler / HandleRequest / ResumeRoom 这三个 C++ 唯一调用的入口驱动它。
--
-- 三条设计约束，都是被实测逼出来的：
--  * 时间只有一个来源：这里的虚拟时钟。JS 每次 resume 时显式推进它。
--    引擎看不到墙钟，所以两次运行的时间线一致。
--  * 出站消息不逐条过 Lua/JS 边界，攒在 sink 里由 flush() 一次交出。
--    一局 8 人局有 6 万多条消息，但只有 2 千多个 flush 边界。
--  * 原始 CBOR 字节过不了 wasmoon 的 UTF-8 字符串边界，一律 base64。
--    JS 侧一路不解码，直接把不透明字节搬到对端客户端 VM。

FKHost = {}

local canon, b64, state
local vclock_us = 0

-- ============================================================ 1. 载入引擎
function FKHost.boot()
  -- 时钟必须先于 freekill.lua 就位：freekill.lua 会把 os 表裁剪成只剩五个函数，
  -- 裁完之后就没机会替换了。
  os.time = function() return 1700000000 + vclock_us // 1000000 end
  os.clock = function() return vclock_us / 1e6 end
  os.getms = function() return vclock_us end
  os.date = function() return "1970-01-01" end
  os.difftime = function(a, b) return a - b end

  package.path = "./?.lua;./?/init.lua;./lua/lib/?.lua;./lua/?.lua;./lua/?/init.lua"

  fk = dofile("lua/web/fkhost.lua")
  canon = dofile("lua/web/canon.lua")
  b64 = dofile("lua/web/b64.lua")
  FKHost.canon = canon
  FKHost.b64 = b64

  dofile("lua/freekill.lua")
  dofile("lua/client/i18n/init.lua")

  -- 手杀包依赖的两个 Room 方法，本镜像还没有。必须在包加载之后、开局之前。
  dofile("lua/web/roomcompat.lua")

  -- 技能不全的武将不进开局池。客户端 client.lua 里跑的是同一份代码、同一个
  -- 顺序，所以两边看到的武将池一致 —— 不一致会直接违反 bundle 哈希的承诺。
  dofile("lua/web/roster.lua").hideIncomplete()

  -- Animate{type="InvokeSkill"} 补上 compulsory，理由见 skillwire.lua。
  dofile("lua/web/skillwire.lua").installHost()

  -- 包内容 bug 的就地补丁，理由见 skillfix.lua。
  dofile("lua/web/skillfix.lua").install()

  dofile("lua/server/scheduler.lua")

  state = dofile("lua/web/state.lua")
  -- 跨 JS 运行时的确定性补丁，理由见 determinism.lua。必须在 scheduler 之后。
  dofile("lua/web/determinism.lua").install()

  ---@diagnostic disable-next-line
  dbg = Util.DummyFunc
  debug.debug = Util.DummyFunc

  InitScheduler(fk.RoomThread(), fk.Server())
  FKHost.installDecisionHook()
  return true
end

--- 虚拟时钟：只有 JS 侧显式推进，引擎自己看不到墙钟。
---@param us integer
function FKHost.advanceUs(us)
  if us and us > 0 then vclock_us = vclock_us + math.floor(us) end
  return vclock_us
end

function FKHost.clockUs() return vclock_us end
__fk_now_us = function() return vclock_us end

-- ============================================================ 2. 建房
local DEFAULT_SETTINGS = {
  enableFreeAssign = false,
  enableDeputy = false,
  gameMode = "aaa_role_mode",
  disabledPack = {},
  generalNum = 3,
  -- Room:askToChooseGeneral 会读它并在 nil 时报错，不是可选项。
  generalTimeout = 30,
  enableObserverViewCard = false,
  luckTime = 0,
  password = "",
  disabledGenerals = {},
}

--- @param specJson string
--- spec = { id, seed, timeout, ownerId, settings = {...},
---          seats = {{connId,playerId,screenName,avatar,state}} }
function FKHost.createRoom(specJson)
  local spec = json.decode(specJson)
  local id = spec.id or 1

  -- 唯一的确定性播种点。lua/freekill.lua:18 的 math.randomseed(os.time()) 用的是
  -- 虚拟时钟的常量，所以引擎载入本身已经是确定的；这里再按房间种子播一次，
  -- 之后的一切随机都只由 seed 决定。不改 lua/ 下任何文件。
  math.randomseed(spec.seed)

  local s = {}
  for k, v in pairs(DEFAULT_SETTINGS) do s[k] = v end
  for k, v in pairs(spec.settings or {}) do s[k] = v end

  local players = {}
  for i, p in ipairs(spec.seats) do
    players[i] = {
      connId = p.connId or p.playerId,
      id = p.playerId,
      screenName = p.screenName or ("player" .. p.playerId),
      avatar = p.avatar or "guojia",
      state = p.state or fk.Player_Robot,
      gameData = { 0, 0, 0 },
    }
  end

  fk._rooms[id] = fk.Room {
    id = id,
    ownerId = spec.ownerId or players[1].id,
    timeout = spec.timeout or 15,
    players = players,
    settings = cbor.encode(s),
  }

  FKHost.seed = spec.seed
  FKHost.decisions = {}
  FKHost.roomId = id
  FKHost._room = nil

  -- 进房三连必须走正常出站流，而且要在任何游戏消息之前。
  --
  -- Qt 版里这三条是 C++ 的 Room::addPlayer 发的，Lua 完全不知情。
  -- 浏览器里没有那层 C++，所以由这里补上。不补的话，从会话开头录下来的
  -- 消息流喂不进一个新的客户端 VM —— 它的 players 表还没建起来，
  -- 第一条 StartGame 就会在 clientbase.lua:420 上索引 nil。
  FKHost.emitJoinPreamble(id)

  HandleRequest("-1," .. id .. ",newroom")
  return true
end

--- 把进房三连（EnterRoom / AddPlayer×n / RoomOwner）作为普通出站消息发出去。
---
--- 三条命令各发一轮，而不是一个座位发完三条再轮下一个。原因在 routing.ts：
--- EnterRoom 和 RoomOwner 对每个座位是同一串字节，会被识别成广播折成一条公共
--- 消息，序号取所有收件人里最小的那个；AddPlayer 因人而异，只能私发。按座位发
--- 的话，二号座位的 AddPlayer 序号排在一号座位的 RoomOwner 后面，于是它先收到
--- 「房主是 1 号」再收到「1 号是谁」—— 一条按谁都没发生过的顺序拼出来的流。
---
--- 按命令分轮之后，所有 EnterRoom 的序号都小于所有 AddPlayer，所有 AddPlayer
--- 都小于所有 RoomOwner，无论折叠取的是哪个座位的序号，每个座位读到的相对
--- 顺序都还是引擎发的那个。全机器人房看不出来（那时三条全是私发），
--- 两个真人以上的房才会踩到。
---@param roomId integer
function FKHost.emitJoinPreamble(roomId)
  local cRoom = fk._rooms[roomId]
  if not cRoom then return false end
  local settings = cbor.decode(cRoom:settings())
  local n = #cRoom.players

  local seated = {}
  for _, me in ipairs(cRoom.players) do
    if me.state ~= fk.Player_Robot then seated[#seated + 1] = me end
  end

  for _, me in ipairs(seated) do
    fk._emit("notify", me.connId, "EnterRoom", cbor.encode { n, cRoom.timeout, settings })
  end
  for _, me in ipairs(seated) do
    for _, p in ipairs(cRoom.players) do
      if p.id ~= me.id then
        fk._emit("notify", me.connId, "AddPlayer",
          cbor.encode { p.id, p:getScreenName(), p:getAvatar(), true, 0 })
      end
    end
  end
  for _, me in ipairs(seated) do
    fk._emit("notify", me.connId, "RoomOwner", cbor.encode { cRoom.ownerId })
  end
  return true
end

-- ============================================================ 3. 驱动
--- HandleRequest 的透传：reconnect / observe / leave / surrender 走这里。
---@param req string
function FKHost.handleRequest(req)
  local ok, err = pcall(HandleRequest, req)
  if not ok then return json.encode { error = tostring(err) } end
  return "{}"
end

--- 把一条玩家回复塞进座位队列。payload 是 base64 后的原始 CBOR，
--- 也就是客户端 VM 自己编出来的那串字节 —— 一路不重编码，就没有保真度问题。
---@param connId integer
---@param payload_b64 string
function FKHost.pushReplyRaw(connId, payload_b64)
  local q = fk._replies[connId]
  if not q then q = {}; fk._replies[connId] = q end
  q[#q + 1] = b64.decode(payload_b64)
  return #q
end

--- 从普通数据塞一条回复（命令日志重放、机器人代打、测试）。
---@param connId integer
---@param valueJson string canon JSON
function FKHost.pushReplyValue(connId, valueJson)
  local v = canon.revive(json.decode(valueJson))
  return FKHost.pushReplyRaw(connId, b64.encode(cbor.encode(v)))
end

--- 唤醒房间。advanceUs 在唤醒前推进虚拟时钟。
---@param roomId integer
---@param reason string?
---@param advanceUs integer?
---@return string json { over, delayMs, requestTimerMs, err? }
function FKHost.resume(roomId, reason, advanceUs)
  FKHost.advanceUs(advanceUs)
  local sink = fk._sink
  sink.batch = sink.batch + 1

  local cRoom = fk._rooms[roomId]
  local before = cRoom and (cRoom._delay_total or 0) or 0
  -- 房间结束后调度器会把它从 runningRooms 里摘掉，GetRoom 就返回 nil 了。
  -- 留一个引用，好让最终状态摘要仍然拿得到。
  FKHost._room = GetRoom(roomId) or FKHost._room

  local ok, over = pcall(ResumeRoom, roomId, reason ~= "" and reason or nil)
  if not ok then
    return json.encode { over = true, err = tostring(over) }
  end

  local after = cRoom and (cRoom._delay_total or 0) or 0
  return json.encode {
    over = over and true or false,
    delayMs = after - before,
    requestTimerMs = cRoom and cRoom._request_timer or nil,
  }
end

-- ============================================================ 4. 出站
-- protocol.ts 点名要求：SetCardUseHistory / SetSkillUseHistory /
-- SetSkillBranchUseHistory 三条占了 8 人局 64,680 条消息里的 45,120 条（69.8%），
-- 每条 5-6 字节。它们不能丢（对端客户端要靠它们维护使用次数，而次数喂给合法性判定），
-- 但同一个 (角色, 牌名/技能名, 作用域) 在一次 flush 里常被反复重写，只有最后一次算数。
--
-- 只在「连续的一段」里合并，不跨越其他命令。因为客户端在一批消息里是逐条执行回调的，
-- 中间要是插了一条 AskFor*，它的合法性计算就会读到被我们抹掉的那个中间值。
local COALESCE = {
  SetCardUseHistory = function(d) return d[1] .. "|" .. tostring(d[2]) .. "|" .. tostring(d[4]) end,
  SetSkillUseHistory = function(d) return d[1] .. "|" .. tostring(d[2]) .. "|" .. tostring(d[4]) end,
  SetSkillBranchUseHistory = function(d)
    return d[1] .. "|" .. tostring(d[2]) .. "|" .. tostring(d[3]) .. "|" .. tostring(d[5])
  end,
}

---@param msgs table 一次 flush 里某个 connId 的消息，按 seq 升序
---@return table 合并后的消息
local function coalesceRun(msgs)
  local out, n = {}, 0
  local i = 1
  local total = #msgs
  while i <= total do
    local keyfn = COALESCE[msgs[i].command]
    if not keyfn then
      n = n + 1; out[n] = msgs[i]; i = i + 1
    else
      -- 收集这一段连续的可合并消息
      local j = i
      while j <= total and COALESCE[msgs[j].command] do j = j + 1 end
      local lastAt, order = {}, {}
      for k = i, j - 1 do
        local m = msgs[k]
        local ok, d = pcall(cbor.decode, m.payload, state.WIRE_OPTS)
        local key
        if ok and type(d) == "table" then
          local okk, kk = pcall(COALESCE[m.command], d)
          key = okk and (m.command .. "\0" .. kk) or ("#" .. k)
        else
          key = "#" .. k
        end
        if lastAt[key] == nil then order[#order + 1] = key end
        lastAt[key] = m
      end
      for _, key in ipairs(order) do n = n + 1; out[n] = lastAt[key] end
      i = j
    end
  end
  return out
end

--- 交出自上次 flush 以来的所有出站消息。
--- 负载在这一批内去重后 base64；msgs 里用下标引用。
---@param decodeData boolean? 同时给出解码后的数据（fixtures / 调试 / Agent 2 的检视）
---@param coalesce boolean? 合并高频计数命令，默认开
---@return string canon JSON { payloads, data?, msgs }
function FKHost.flush(decodeData, coalesce)
  local sink = fk._sink
  local from = sink.cursor + 1
  local to = sink.seq
  sink.cursor = to
  if from > to then return '{"payloads":[],"data":[],"msgs":[]}' end

  local raw = {}
  for i = from, to do raw[#raw + 1] = sink.msgs[i] end

  if coalesce ~= false then
    -- 按 (batch, connId) 分组后各自合并，保持组内原顺序
    local groups, gorder = {}, {}
    for _, m in ipairs(raw) do
      local k = m.batch .. ":" .. m.connId
      if not groups[k] then groups[k] = {}; gorder[#gorder + 1] = k end
      local g = groups[k]
      g[#g + 1] = m
    end
    local merged = {}
    for _, k in ipairs(gorder) do
      for _, m in ipairs(coalesceRun(groups[k])) do merged[#merged + 1] = m end
    end
    table.sort(merged, function(a, b) return a.seq < b.seq end)
    raw = merged
  end

  local payloads, index, np = {}, {}, 0
  local data = {}
  local msgs, nm = {}, 0
  for _, m in ipairs(raw) do
    local pi = index[m.payload]
    if not pi then
      np = np + 1
      payloads[np] = b64.encode(m.payload)
      index[m.payload] = np
      pi = np
      if decodeData then
        local ok, d = pcall(cbor.decode, m.payload, state.WIRE_OPTS)
        data[np] = ok and d or nil
      end
    end
    nm = nm + 1
    msgs[nm] = {
      s = m.seq, b = m.batch,
      k = m.kind == "request" and "r" or "n",
      c = m.connId, m = m.command, p = pi, n = #m.payload,
    }
  end
  return canon.encode { payloads = payloads, data = decodeData and data or nil, msgs = msgs }
end

--- 丢弃已 flush 的消息体，防止长局把 Lua 堆撑起来。
function FKHost.trimStream()
  local sink = fk._sink
  for i = 1, sink.cursor do sink.msgs[i] = nil end
  return sink.cursor
end

-- ============================================================ 5. 决策与重放
-- 唯一的 hook 点：Request:_checkReply。一次「非 __notready」的返回就是一个决策边界。
--
-- 这个 hook 身兼两职：
--  * 记录：每条被接受的回复 + 那一刻的状态摘要，就是 contract 里的 DecisionRecord。
--  * 重放：设了重放日志时，直接把日志里的回复顶回去，AI 完全不参与。
--    这也是为什么 AI 自身的不确定性伤不到换主 —— 重放路径根本不问它。
FKHost.replayLog = nil
FKHost.divergence = nil

function FKHost.installDecisionHook()
  if FKHost._hooked then return end
  FKHost._hooked = true
  local orig = Request._checkReply

  Request._checkReply = function(self, player, use_ai)
    local log = FKHost.replayLog
    local logged, idx
    if log then
      idx = #FKHost.decisions + 1
      logged = log[idx]
      if logged == nil then
        -- 日志用完了。这里不能直接放行：那会多走出几个决策，
        -- 而换主要的是「停在日志的最后一格」。
        --
        -- 引擎自己就有干净的停法：_checkReply 顶上的 __test_breakpoints
        -- 就是靠 room:yield() 在一次 Request 中途把协程挂起的。照它做。
        -- 挂起后的房间状态正是交接点；驱动侧看到 logExhausted 就停止 resume。
        if not FKHost.logExhausted then
          FKHost.logExhausted = true
          local r0 = GetRoom(FKHost.roomId or 1)
          if r0 then r0:yield() end
        end
      elseif logged.playerId == player.id and logged.command == self.command
        and player.serverplayer:getState() == fk.Player_Online then
        -- 真人座位：把日志里的回复塞进队列，让 waitForReply 自然取到，
        -- 于是 _checkReply 走的还是原本那条路（含 setThinking、luck card 等）。
        local connId = player.serverplayer.connId
        local q = fk._replies[connId]
        if not q then q = {}; fk._replies[connId] = q end
        table.insert(q, 1, cbor.encode(logged._value))
      end
    end

    -- 关键：不管重放与否，orig 一定要跑。
    --
    -- 早先的做法是有日志就跳过 orig 直接顶回去，结果第 29 个边界就分歧了。
    -- 原因是 AI 会消耗 math.random（smart_ai 的收益估算里有 0.5 - math.random()），
    -- 而引擎在决策之外也用同一条随机流（Request:_finish 会把没答复的人
    -- 换成 setDefaultReply 里 table.random 算出来的默认值）。
    -- 跳过 AI 就等于把随机流往前挪了一格，之后所有的「随机」都错位。
    -- 让 AI 照跑、只把它的答案换掉，随机流就对齐了。
    local reply = orig(self, player, use_ai)

    if logged and reply ~= "__notready" then
      if logged.playerId == player.id and logged.command == self.command then
        reply = logged._value
      else
        -- 重放序列与本次运行的询问顺序对不上 —— 这本身就是分歧，必须喊出来
        FKHost.divergence = FKHost.divergence or string.format(
          "decision %d: log has (%d,%s) but this run asked (%d,%s)",
          idx, logged.playerId, logged.command, player.id, self.command)
      end
    end

    if reply ~= "__notready" then
      local room = GetRoom(FKHost.roomId or 1)
      FKHost._room = room or FKHost._room
      local d = FKHost.decisions
      if d and room then
        d[#d + 1] = {
          seq = #d + 1,
          playerId = player.id,
          command = self.command,
          reply = reply,
          digest = FKHost.cheapDigest and "" or canon.digest(state.project(room)),
          _seq = fk._sink.seq,
          _clock = vclock_us,
        }
        -- 调试用：抓下某个边界的完整状态投影，好和另一次运行逐字段对比
        if FKHost._captureAt == #d then
          FKHost._captured = canon.encode(state.project(room))
        end
      end
    end
    return reply
  end
end

--- 载入重放日志。log 是 DecisionRecord[] 的 canon JSON。
---@param logJson string
function FKHost.setReplayLog(logJson)
  local log = json.decode(logJson)
  for _, d in ipairs(log) do d._value = canon.revive(d.reply) end
  FKHost.replayLog = log
  FKHost.divergence = nil
  FKHost.logExhausted = false
  return #log
end

function FKHost.clearReplayLog()
  FKHost.replayLog = nil
  FKHost.logExhausted = false
  return true
end

--- 重放到哪儿了 / 有没有对不上
function FKHost.replayStatus()
  return json.encode {
    applied = #(FKHost.decisions or {}),
    total = FKHost.replayLog and #FKHost.replayLog or 0,
    divergence = FKHost.divergence,
    exhausted = FKHost.logExhausted and true or false,
  }
end


---@param from integer 1-based，返回 [from, #decisions]
function FKHost.decisionsFrom(from)
  local out = {}
  for i = (from or 1), #(FKHost.decisions or {}) do
    local d = FKHost.decisions[i]
    out[#out + 1] = {
      seq = d.seq, playerId = d.playerId, command = d.command,
      reply = d.reply, digest = d.digest,
    }
  end
  return canon.encode(out)
end

function FKHost.decisionCount() return #(FKHost.decisions or {}) end

-- ============================================================ 6. 状态
---@param roomId integer
function FKHost.digest(roomId)
  local room = GetRoom(roomId) or FKHost._room
  if not room then return "" end
  return canon.digest(state.project(room))
end

---@param roomId integer
function FKHost.stateJson(roomId)
  local room = GetRoom(roomId) or FKHost._room
  if not room then return "null" end
  return canon.encode(state.project(room))
end

--- 单个座位视角的房间快照（重连 / 观战用），CBOR + base64。
---@param roomId integer
---@param pid integer
function FKHost.resyncPayload(roomId, pid)
  local room = GetRoom(roomId) or FKHost._room
  if not room then return "" end
  local p = room:getPlayerById(pid) or room.players[1]
  return b64.encode(cbor.encode(room:serialize(p)))
end

--- 一个新客户端进房时，C++ 的 Room::addPlayer 会先补三条消息。
--- 浏览器里没有那层 C++，所以由引擎自己用同一份 cbor 编出来。
---@param roomId integer
---@param pid integer 这个客户端坐的位子
---@return string canon JSON [{command, payload(b64)}]
function FKHost.joinPreamble(roomId, pid)
  local cRoom = fk._rooms[roomId]
  if not cRoom then return "[]" end
  local out = {}
  local settings = cbor.decode(cRoom:settings())
  local n = #cRoom.players
  out[#out + 1] = {
    command = "EnterRoom",
    payload = b64.encode(cbor.encode { n, cRoom.timeout, settings }),
  }
  for _, p in ipairs(cRoom.players) do
    if p.id ~= pid then
      out[#out + 1] = {
        command = "AddPlayer",
        payload = b64.encode(cbor.encode { p.id, p:getScreenName(), p:getAvatar(), true, 0 }),
      }
    end
  end
  out[#out + 1] = {
    command = "RoomOwner",
    payload = b64.encode(cbor.encode { cRoom.ownerId }),
  }
  return canon.encode(out)
end

--- 把一名观战者接入房间的 C++ 层，随后 handleRequest("<roomId>,<id>,observe")
function FKHost.addObserverSeat(roomId, connId, id, name, avatar)
  local cRoom = fk._rooms[roomId]
  if not cRoom then return false end
  table.insert(cRoom.observers, fk.ServerPlayer {
    connId = connId, id = id, screenName = name or ("obs" .. id),
    avatar = avatar or "guojia", state = fk.Player_Online,
  })
  return true
end

function FKHost.removeObserverSeat(roomId, id)
  local cRoom = fk._rooms[roomId]
  if not cRoom then return false end
  for i, p in ipairs(cRoom.observers) do
    if p.id == id then table.remove(cRoom.observers, i); return true end
  end
  return false
end

--- 改一名玩家的连接状态（Online / Trust / Offline），供掉线与托管使用。
function FKHost.setPlayerState(roomId, id, state_)
  local cRoom = fk._rooms[roomId]
  if not cRoom then return false end
  for _, p in ipairs(cRoom.players) do
    if p.id == id then p.state = state_; return true end
  end
  return false
end

--- 房间此刻在等谁。为空且未结束就说明还能继续 resume（人机 / 延迟在推进）。
--- 判据是引擎自己的状态：Online 且正在烧条（thinking）且队列里没有待处理回复。
---@param roomId integer
---@return string canon JSON integer[]
function FKHost.pendingInput(roomId)
  local cRoom = fk._rooms[roomId]
  if not cRoom then return "[]" end
  local out = {}
  for _, p in ipairs(cRoom.players) do
    if p.state == fk.Player_Online and p:thinking() then
      local q = fk._replies[p.connId]
      if not q or #q == 0 then out[#out + 1] = p.connId end
    end
  end
  return canon.encode(out)
end

--- 让下一次到达第 n 个决策边界时留下完整状态投影。
function FKHost.captureDecision(n)
  FKHost._captureAt = n
  FKHost._captured = nil
  return true
end

function FKHost.capturedState()
  return FKHost._captured or "null"
end

function FKHost.stats()
  local sink = fk._sink
  return json.encode {
    messages = sink.seq,
    bytes = sink.bytes,
    batches = sink.batch,
    decisions = #(FKHost.decisions or {}),
    clockUs = vclock_us,
    luaHeapKiB = math.floor(collectgarbage("count")),
  }
end

return FKHost
