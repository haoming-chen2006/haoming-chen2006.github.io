-- client.lua -- 客户端 VM 的 Lua 侧入口（跑在浏览器主线程）
--
-- 主线程 VM 之所以不进 Worker：现有 QML 客户端有 ~164 处同步 Lua.call
-- （GetCardData / CardFitPattern / RefreshStatusSkills），全在渲染路径上。
-- 放进 Worker 就全变异步了。这里保持同步，和 QML 今天的行为一致。

FKClient = {}

local canon, b64

-- ============================================================ 1. 载入引擎（客户端半边）
function FKClient.boot()
  local vclock_us = 0
  FKClient.advanceUs = function(us) vclock_us = vclock_us + math.floor(us or 0) end
  __fk_now_us = function() return vclock_us end

  os.time = function() return 1700000000 + vclock_us // 1000000 end
  os.clock = function() return vclock_us / 1e6 end
  os.getms = function() return vclock_us end
  os.date = function() return "1970-01-01" end
  os.difftime = function(a, b) return a - b end

  package.path = "./?.lua;./?/init.lua;./lua/lib/?.lua;./lua/?.lua;./lua/?/init.lua"

  fk = dofile("lua/web/fkclient.lua")
  canon = dofile("lua/web/canon.lua")
  b64 = dofile("lua/web/b64.lua")
  FKClient.canon = canon
  FKClient.b64 = b64

  dofile("lua/freekill.lua")
  dofile("lua/client/i18n/init.lua")

  fk.FK_VER = fk.FK_VER or "web"
  dofile("lua/client/client.lua")

  ---@diagnostic disable-next-line
  dbg = Util.DummyFunc
  debug.debug = Util.DummyFunc
  return true
end

-- ============================================================ 2. 接线
local sink = {
  ui = {}, uiCursor = 0,
  out = {}, outCursor = 0,
  errors = {},
}
FKClient.sink = sink

local ClientMT = {}
ClientMT.__index = {
  sendSetupPacket = function() end,
  setupServerLag = function() end,
  installMyAESKey = function() end,
  saveRecord = function() end,
  saveGameData = function() end,

  notifyServer = function(self, command, data)
    sink.out[#sink.out + 1] = { kind = "notify", command = command, payload = b64.encode(tostring(data)) }
  end,
  replyToServer = function(self, command, data)
    sink.out[#sink.out + 1] = { kind = "reply", command = command, payload = b64.encode(tostring(data)) }
  end,

  addPlayer = function(self, id, name, avatar)
    self.players[id] = fk.newPlayer(id, name, avatar)
    return self.players[id]
  end,
  removePlayer = function(self, id) self.players[id] = nil end,
  getSelf = function(self) return self._self end,
  changeSelf = function(self, id) self._self = self.players[id] or self._self end,

  notifyUI = function(self, command, data)
    sink.ui[#sink.ui + 1] = { command = command, data = data }
    -- 场景式询问（出牌、响应、发动技能）不是自己把回复发出去的：
    -- RequestHandler:doOKButton 只 notifyUI("ReplyToServer", reply)，
    -- 真正回发是 QML 收到这条之后调 ClientInstance.replyToServer("", data)
    -- （Fk/Pages/LunarLTK/RoomLogic.js:141）。
    -- 浏览器里没有那层 QML，所以在这儿把环闭上 —— 否则点了确定也发不出回复，
    -- 而且这件事不该泄漏成每个 UI 实现都要记得做的一步。
    if command == "ReplyToServer" then
      self:replyToServer("", cbor.encode(data))
    end
  end,
}

--- 把这个 VM 绑到某个座位上。
---@param specJson string { id, name, avatar, observing?, replaying? }
function FKClient.attach(specJson)
  local spec = json.decode(specJson)
  local me = fk.newPlayer(spec.id, spec.name, spec.avatar, fk.Player_Online)
  local cClient = setmetatable({ _self = me, players = { [spec.id] = me } }, ClientMT)
  FKClient.cClient = cClient

  CreateLuaClient(cClient)
  Self = ClientPlayer:new(cClient:getSelf())
  ClientSelf = Self

  if spec.observing then SetObserving(true) end
  if spec.replaying then SetReplaying(true) end
  return true
end

-- ============================================================ 3. 入站
--- 喂一条来自权威房间的消息。payload 是 base64 后的原始 CBOR。
---@param command string
---@param payload_b64 string
---@param isRequest boolean?
function FKClient.feed(command, payload_b64, isRequest)
  local ok, err = pcall(ClientCallback, FKClient.cClient, command,
    b64.decode(payload_b64), isRequest and true or false)
  if not ok then
    sink.errors[#sink.errors + 1] = command .. ": " .. tostring(err)
    return false
  end
  return true
end

--- 批量喂：一次过边界喂一整个 flush 批次。
---
--- 优先走 payload（原始 CBOR 的 base64）—— 那就是权威 VM 自己编出来的字节，
--- 一路不重编码，保真度问题根本不存在。
--- value 是给 fixtures 驱动的调试面板兜底的：普通数据要重新 cbor.encode，
--- 而 canon JSON 会把整型浮点压成整数、把非字符串键字符串化，是有损的。
---@param batchJson string [{command, payload?, value?, isRequest}]
function FKClient.feedBatch(batchJson)
  local list = json.decode(batchJson)
  local n = 0
  for _, m in ipairs(list) do
    local encoded
    if m.payload then
      encoded = b64.decode(m.payload)
    else
      encoded = cbor.encode(canon.revive(m.value))
    end
    local ok, err = pcall(ClientCallback, FKClient.cClient, m.command, encoded,
      m.isRequest and true or false)
    if ok then
      n = n + 1
    else
      sink.errors[#sink.errors + 1] = m.command .. ": " .. tostring(err)
    end
  end
  return n
end

-- ============================================================ 4. 出站 / UI
function FKClient.drainUI()
  local from = sink.uiCursor + 1
  local out = {}
  for i = from, #sink.ui do
    local e = sink.ui[i]
    out[#out + 1] = { seq = i, command = e.command, data = e.data }
    sink.ui[i] = { command = e.command } -- 放掉数据，长局不涨堆
  end
  sink.uiCursor = #sink.ui
  return canon.encode(out)
end

function FKClient.drainOutbound()
  local from = sink.outCursor + 1
  local out = {}
  for i = from, #sink.out do
    local e = sink.out[i]
    out[#out + 1] = { seq = i, kind = e.kind, command = e.command, payload = e.payload }
  end
  sink.outCursor = #sink.out
  return canon.encode(out)
end

--- 没人订阅 UI 事件时把它们丢掉，长局才不会一直涨堆。
function FKClient.dropUI()
  for i = sink.uiCursor + 1, #sink.ui do sink.ui[i] = { command = sink.ui[i].command } end
  sink.uiCursor = #sink.ui
  return sink.uiCursor
end

--- 把一条出站回复的原始 CBOR 解回普通数据（给 onReply 用）。
---@param payload_b64 string
function FKClient.decodeReply(payload_b64)
  local ok, v = pcall(cbor.decode, b64.decode(payload_b64))
  if not ok then return "null" end
  return canon.encode(v)
end

function FKClient.errors()
  return canon.encode(sink.errors)
end

function FKClient.counts()
  return json.encode { ui = #sink.ui, out = #sink.out, errors = #sink.errors }
end

--- 回答弹窗式询问（选将、观星、拆牌、破奇、五谷）。
---
--- 这些询问不走 ui_emu 的场景模型：它们各有各的命令和负载，
--- QML 客户端也是直接调 ClientInstance:replyToServer 回的
--- （Fk/Pages/LunarLTK/RoomLogic.js:141）。
--- 回复由这个 VM 自己的 cbor 编码，所以到达权威房间的字节
--- 和 QML 客户端发的完全一致。
---@param command string
---@param valueJson string canon JSON
function FKClient.replyToServer(command, valueJson)
  local v = canon.revive(json.decode(valueJson))
  -- QML 走的是 ClientInstance.replyToServer("", data)，也就是 C++ Client 那一层，
  -- command 一律空串（RoomLogic.js:142），数据从 0.5.12 起直接给值不再 json.encode。
  FKClient.cClient:replyToServer(command or "", cbor.encode(v))
  return true
end

-- ============================================================ 5. Lua.call 面
--- 调用 client_util.lua 里的任意全局函数，这就是 QML 那 164 处 Lua.call 的等价物。
---@param name string
---@param argsJson string { "n": <整数>, "a": [...] }
---@return string canon JSON
function FKClient.call(name, argsJson)
  local fn = _G[name]
  if type(fn) ~= "function" then
    return canon.encode { __error = "no such lua function: " .. tostring(name) }
  end
  local spec = argsJson and argsJson ~= "" and json.decode(argsJson) or { n = 0, a = {} }
  local ok, res = pcall(fn, table.unpack(spec.a or {}, 1, spec.n or 0))
  if not ok then
    return canon.encode { __error = tostring(res) }
  end
  return canon.encode(res)
end

--- 客户端自身的房间快照，供测试断言用（不上线路）。
function FKClient.stateJson()
  if not ClientInstance then return "null" end
  local ok, o = pcall(function() return ClientInstance:serialize() end)
  if not ok then return canon.encode { __error = tostring(o) } end
  local st = dofile("lua/web/state.lua")
  o.banners = st.decodeBlob(o.banners)
  if type(o.card_manager) == "table" then
    o.card_manager.card_marks = st.decodeBlob(o.card_manager.card_marks)
  end
  for _, p in pairs(o.players or {}) do
    if type(p) == "table" then p.mark = st.decodeBlob(p.mark) end
  end
  return canon.encode(o)
end

return FKClient
