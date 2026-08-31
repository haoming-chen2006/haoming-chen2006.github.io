-- boot.lua -- 浏览器里把新月杀服务端引擎跑起来
-- 这是 spike 的 Lua 侧入口，等价于 lua/server/rpc/entry.lua + test/lua/run.lua

FKWeb = {}
local canon

-- ============================================================ 1. 载入引擎
function FKWeb.boot()
  -- 时钟必须先于 freekill.lua 就位：freekill.lua 会把 os 表裁剪成只剩五个函数，
  -- 裁完之后就没机会替换了。
  local vclock_us = 0
  FKWeb.advance = function(ms) vclock_us = vclock_us + math.floor(ms * 1000) end
  FKWeb.clock_us = function() return vclock_us end
  __fk_now_us = function() return vclock_us end

  os.time = function() return 1700000000 + vclock_us // 1000000 end
  os.clock = function() return vclock_us / 1e6 end
  os.getms = function() return vclock_us end
  os.date = function(fmt) return "1970-01-01" end

  package.path = "./?.lua;./?/init.lua;./lua/lib/?.lua;./lua/?.lua;./lua/?/init.lua"

  fk = dofile("web/fkhost.lua")
  canon = dofile("web/canon.lua")
  FKWeb.canon = canon

  dofile("lua/freekill.lua")

  -- freekill.lua 把 os 裁剪过了，再钉一次 getms（util.lua 会覆盖成 fk.GetMicroSecond）
  dofile("lua/client/i18n/init.lua")

  -- 客户端半边（fixtures 用；生产里这是另一个 VM）
  fk.FK_VER = fk.FK_VER or "web-spike"
  dofile("lua/client/client.lua")

  dofile("lua/server/scheduler.lua")

  ---@diagnostic disable-next-line
  dbg = Util.DummyFunc
  debug.debug = Util.DummyFunc

  InitScheduler(fk.RoomThread(), fk.Server())
  return true
end

--- 把引擎里唯一一处「pairs 顺序 -> 游戏结果」的依赖钉死。
---
--- Room:makeGeneralPile 先 pairs(Fk.generals) 收集武将名再 table.shuffle。
--- pairs 的顺序取决于 Lua 的字符串哈希种子，而该种子来自 lua_newstate 时的
--- time()/地址，在不同宿主（node 与浏览器）之间不一样。于是同一个 seed 在两个
--- 环境里会发出完全不同的武将牌堆，也就是完全不同的一局。
--- 换主机重放要跨环境成立，就必须消掉这个依赖，而不是去钉哈希种子。
function FKWeb.pinIterationOrder()
  local names = {}
  for name in pairs(Fk.generals) do names[#names + 1] = name end
  table.sort(names)
  function Room:makeGeneralPile()
    local trueNames = {}
    local ret = {}
    if self.game_started then
      for _, player in ipairs(self.players) do
        trueNames[Fk.generals[player.general].trueName] = true
      end
    end
    for _, name in ipairs(names) do
      local general = Fk.generals[name]
      if Fk:canUseGeneral(name) and not trueNames[general.trueName] then
        table.insert(ret, name)
        trueNames[general.trueName] = true
      end
    end
    table.shuffle(ret)
    self.general_pile = ret
    return true
  end
  FKWeb.order_pinned = true
end

--- pairs(Fk.generals) 的前几项，用来看两个宿主的哈希种子是否一致
function FKWeb.pairsHead(n)
  local t, i = {}, 0
  for k in pairs(Fk.generals) do i = i + 1 if i <= (n or 6) then t[#t + 1] = k end end
  return table.concat(t, ",")
end

-- ============================================================ 2. 建房
local DEFAULT_SETTINGS = {
  enableFreeAssign = false,
  enableDeputy = false,
  gameMode = "aaa_role_mode",
  disabledPack = {},
  generalNum = 3,
  generalTimeout = 30,
  enableObserverViewCard = false,
  luckTime = 0,
  password = "",
  disabledGenerals = {},
}

--- @param seed integer
--- @param nplayers integer
function FKWeb.newRoom(seed, nplayers, settings, trustAll, attachClientSeat)
  nplayers = nplayers or 8

  -- 唯一的确定性补丁：lua/freekill.lua:18 的 math.randomseed(os.time())
  -- 在这里被按房间种子重新播一次。不改 lua/ 下任何文件。
  math.randomseed(seed)

  local s = {}
  for k, v in pairs(DEFAULT_SETTINGS) do s[k] = v end
  for k, v in pairs(settings or {}) do s[k] = v end

  local players = {}
  for i = 1, nplayers do
    players[i] = {
      connId = i,
      id = i,
      screenName = "player" .. i,
      avatar = "guojia",
      -- 1 号位是「托管中的人类」：引擎在 ServerRoomBase:checkNoHuman 里
      -- 会把一屋子机器人的房间直接判定为无人并结束，所以纯 Robot 开不了局。
      -- Trust 走的仍然是 AI 应答路径，但 doRequest 照常发出，
      -- 因此 1 号位的消息流就是一个真人客户端会收到的流。
      state = (trustAll or i == 1) and fk.Player_Trust or fk.Player_Robot,
      gameData = { 0, 0, 0 },
    }
  end

  fk._webrooms[1] = fk.Room {
    id = 1,
    ownerId = 1,
    timeout = 15,
    players = players,
    settings = cbor.encode(s),
  }

  FKWeb.seed = seed
  FKWeb.steps = {}
  FKWeb.replay = nil
  FKWeb.divergence = nil

  if attachClientSeat then
    local fkclient = dofile("web/fkclient.lua")
    FKWeb.client = fkclient.attach(attachClientSeat, attachClientSeat, nplayers, s, 15)
  end

  HandleRequest("-1,1,newroom")
  return true
end

-- ============================================================ 3. 决策记录 / 重放
-- 唯一的 hook 点：Request:_checkReply。一次「非 __notready」的返回就是一个决策边界。
function FKWeb.installHook()
  local orig = Request._checkReply
  Request._checkReply = function(self, player, use_ai)
    local replay = FKWeb.replay
    local reply
    if replay then
      local idx = #FKWeb.steps + 1
      local logged = replay[idx]
      if logged and logged.pid == player.id and logged.command == self.command then
        reply = logged.reply
      else
        -- 重放序列与本次运行的询问顺序对不上 —— 这本身就是分歧
        if logged == nil then
          reply = orig(self, player, use_ai)
        else
          FKWeb.divergence = FKWeb.divergence or string.format(
            "step %d: log has (%d,%s) but run asked (%d,%s)",
            idx, logged.pid, logged.command, player.id, self.command)
          reply = orig(self, player, use_ai)
        end
      end
    else
      reply = orig(self, player, use_ai)
    end

    if reply ~= "__notready" then
      local room = GetRoom(1)
      local step = {
        pid = player.id,
        command = self.command,
        reply = reply,
        digest = canon.digest(room:serialize()),
        nstream = #fk._websink.stream,
      }
      FKWeb.steps[#FKWeb.steps + 1] = step
    end
    return reply
  end
end

-- ============================================================ 4. 跑
function FKWeb.run(maxResumes)
  maxResumes = maxResumes or 500000
  local over, n = false, 0
  local reason = nil
  local room = GetRoom(1)
  while not over do
    n = n + 1
    if n > maxResumes then error("resume guard tripped at " .. n) end
    -- 虚拟时钟只在引擎主动 delay 时前进，重放才能对齐
    local before = room.room._delay_total or 0
    fk._websink.batch = fk._websink.batch + 1
    over = ResumeRoom(1, reason)
    local after = (room.room._delay_total or 0)
    if after > before then FKWeb.advance(after - before) end
    reason = "delay_done"
    local r = GetRoom(1)
    if r then FKWeb.final_digest = canon.digest(r:serialize()) end
  end
  FKWeb.resumes = n
  return n
end

-- ============================================================ 5. 结果导出
function FKWeb.summary()
  local sink = fk._websink
  local perconn = {}
  local bycommand = {}
  local batchkey = {}
  local nbatches = 0
  for _, m in ipairs(sink.stream) do
    local c = perconn[m.connId] or { n = 0, bytes = 0, requests = 0, batches = 0 }
    c.n = c.n + 1
    c.bytes = c.bytes + m.nbytes
    if m.kind == "request" then c.requests = c.requests + 1 end
    local key = m.connId .. ":" .. m.batch
    if not batchkey[key] then
      batchkey[key] = true
      c.batches = c.batches + 1
      nbatches = nbatches + 1
    end
    perconn[m.connId] = c

    local b = bycommand[m.command] or { n = 0, bytes = 0 }
    b.n = b.n + 1
    b.bytes = b.bytes + m.nbytes
    bycommand[m.command] = b
  end

  local step_digests = {}
  for i, s in ipairs(FKWeb.steps) do
    step_digests[i] = { i = i, pid = s.pid, command = s.command, digest = s.digest, nstream = s.nstream }
  end

  local totalBytes = 0
  for _, m in ipairs(sink.stream) do totalBytes = totalBytes + m.nbytes end

  return canon.encode {
    seed = FKWeb.seed,
    resumes = FKWeb.resumes,
    steps = #FKWeb.steps,
    messages = #sink.stream,
    total_cbor_bytes = totalBytes,
    flush_batches = nbatches,
    perconn = perconn,
    bycommand = bycommand,
    step_digests = step_digests,
    stream_digest = canon.digest(sink.stream),
    final_state_digest = FKWeb.final_digest,
    divergence = FKWeb.divergence,
    virtual_ms = FKWeb.clock_us() // 1000,
    ui_notifies = FKWeb.client and #FKWeb.client.ui or 0,
    ui_scenes = FKWeb.client and #FKWeb.client.scenes or 0,
    ui_errors = FKWeb.client and FKWeb.client.errors and #FKWeb.client.errors or 0,
  }
end

--- 完整的出站消息流（fixtures 用）
function FKWeb.dumpStream()
  return canon.encode(fk._websink.stream)
end

--- 决策序列，Lua 字面量形式，可以在新 VM 里 load() 回来做逐字重放
function FKWeb.dumpLogLua()
  local out = {}
  for i, s in ipairs(FKWeb.steps) do
    out[i] = { pid = s.pid, command = s.command, reply = s.reply }
  end
  return "return " .. canon.lua_literal(out)
end

--- 决策序列（command log 用）
function FKWeb.dumpLog()
  local out = {}
  for i, s in ipairs(FKWeb.steps) do
    out[i] = { i = i, pid = s.pid, command = s.command, reply = s.reply, digest = s.digest }
  end
  return canon.encode { seed = FKWeb.seed, steps = out }
end

--- 载入重放序列（由 JS 侧把 dumpLog 的结果解析后回填）
function FKWeb.setReplay(t)
  FKWeb.replay = t
end

return FKWeb
