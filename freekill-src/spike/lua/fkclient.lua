-- fkclient.lua -- 在同一个 Lua state 里挂一个客户端，用来产出 UpdateRequestUI 数据
--
-- 生产环境里客户端 VM 跑在主线程、服务端 VM 跑在 Web Worker，是两个 state。
-- spike 里合用一个 state 是为了拿到 fixtures —— 做法完全照抄
-- test/lua/lib/fake_backend.lua，它也是这么干的（连 RoomInstance/Self 的来回换
-- 都一样）。这是 spike 的取巧，不是架构。

local M = {}

-- ---------------------------------------------------------------- fk.Player
local PlayerMT = {}
PlayerMT.__index = {
  getId = function(t) return t.id end,
  setId = function(t, v) t.id = v end,
  getScreenName = function(t) return t.screenName end,
  setScreenName = function(t, v) t.screenName = v end,
  getAvatar = function(t) return t.avatar end,
  setAvatar = function(t, v) t.avatar = v end,
  getTotalGameTime = function() return 0 end,
  addTotalGameTime = function() end,
  getState = function(t) return t.state end,
  setState = function(t, v) t.state = v end,
  setDied = function(t, v) t.died = v end,
  getDied = function(t) return t.died end,
  isDied = function(t) return t.died end,
  setThinking = function(t, v) t.thinking = v end,
  thinking = function(t) return t.thinking end,
  setGameData = function(t, a, b, c) t.gameData = { a, b, c } end,
  getGameData = function(t) return fk.QList(t.gameData or { 0, 0, 0 }) end,
}

local function newPlayer(id, name, avatar, state)
  return setmetatable({
    id = id, screenName = name or ("player" .. id), avatar = avatar or "guojia",
    state = state or fk.Player_Online, died = false, thinking = false,
    gameData = { 0, 0, 0 },
  }, PlayerMT)
end
M.newPlayer = newPlayer

-- ---------------------------------------------------------------- fk.Client
local ClientMT = {}
ClientMT.__index = {
  sendSetupPacket = function() end,
  setupServerLag = function() end,
  installMyAESKey = function() end,
  saveRecord = function() end,
  saveGameData = function() end,
  notifyServer = function(self, command, data)
    self._sink.outbound[#self._sink.outbound + 1] = { kind = "notify", command = command, raw = data }
  end,
  replyToServer = function(self, command, data)
    self._sink.outbound[#self._sink.outbound + 1] = { kind = "reply", command = command, raw = data }
  end,
  addPlayer = function(self, id, name, avatar)
    self.players[id] = newPlayer(id, name, avatar)
    return self.players[id]
  end,
  removePlayer = function(self, id) self.players[id] = nil end,
  getSelf = function(self) return self._self end,
  changeSelf = function(self, id) self._self = self.players[id] or self._self end,
  notifyUI = function(self, command, data)
    local sink = self._sink
    sink.ui[#sink.ui + 1] = { command = command, data = data, at = #sink.ui + 1 }
    if command == "UpdateRequestUI" then
      sink.scenes[#sink.scenes + 1] = data
    end
  end,
}

--- 挂一个客户端到某个座位上。返回 sink（ui / scenes / outbound）。
---@param connId integer
---@param seatId integer
---@param nplayers integer
function M.attach(connId, seatId, nplayers, settings, timeout)
  local sink = { ui = {}, scenes = {}, outbound = {} }

  local me = newPlayer(seatId, "player" .. seatId, "guojia", fk.Player_Online)
  local cClient = setmetatable({
    _self = me,
    players = { [seatId] = me },
    _sink = sink,
  }, ClientMT)

  CreateLuaClient(cClient)
  Self = ClientPlayer:new(cClient:getSelf())
  ClientSelf = Self

  local function feed(command, encoded)
    local room = RoomInstance
    RoomInstance = nil
    local s = Self
    Self = ClientSelf
    local ok, err = pcall(ClientCallback, cClient, command, encoded, false)
    Self = s
    RoomInstance = room
    if not ok then
      sink.errors = sink.errors or {}
      sink.errors[#sink.errors + 1] = command .. ": " .. tostring(err)
    end
  end
  sink.feed = feed

  -- 模拟 C++ Room::addPlayer：客户端在开局前就该知道房间和座位
  feed("EnterRoom", cbor.encode { nplayers, timeout, settings })
  for i = 1, nplayers do
    if i ~= seatId then
      feed("AddPlayer", cbor.encode { i, "player" .. i, "guojia", true, 0 })
    end
  end
  feed("RoomOwner", cbor.encode { 1 })

  fk._webclients[connId] = function(_kind, command, encoded)
    feed(command, encoded)
  end

  return sink
end

return M
