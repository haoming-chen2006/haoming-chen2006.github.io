-- fkhost.lua -- 浏览器版的 lua/server/rpc/fk.lua
--
-- 这是一个 overlay，绝不修改 lua/ 下的任何文件。
-- 与 rpc 版的唯一区别：callRpc 的 stdio + json-rpc 传输换成了直接注入的宿主函数，
-- socket.gettime 换成可注入的时钟，lfs 换成宿主的虚拟文件系统。
--
-- 注入的全局（由 JS 侧 lua.global.set 提供，全部同步）：
--   __fk_log(level, msg)
--   __fk_now_us() -> integer
--   __fk_ls(path) -> string  (换行分隔)
--   __fk_pwd() -> string
--   __fk_cd(path)
--   __fk_exists(path) -> boolean
--   __fk_isdir(path) -> boolean
--   __fk_tick(kind, connId, command, nbytes)   -- 每条出站消息一次，纯数字/短字符串
--   __fk_wait_reply(connId, timeout) -> string?

local fk = {}

-- ---------------------------------------------------------------- 时钟
-- 全部走宿主的单调时钟，保证可重放。
local now_us = __fk_now_us

---@return integer
function fk.GetMicroSecond()
  return math.floor(now_us())
end

-- ---------------------------------------------------------------- 日志
local function logf(level)
  return function(fmt, ...)
    local ok, s = pcall(string.format, fmt, ...)
    __fk_log(level, ok and s or tostring(fmt))
  end
end

fk.qDebug = logf("debug")
fk.qInfo = logf("info")
fk.qWarning = logf("warn")
fk.qCritical = logf("error")

function print(...)
  local args, n = { ... }, select("#", ...)
  local parts = {}
  for i = 1, n do parts[i] = tostring(args[i]) end
  __fk_log("print", table.concat(parts, "\t"))
end

-- ---------------------------------------------------------------- swig/freekill.i
---@return string
function fk.GetDisabledPacks()
  return "[]"
end

-- ---------------------------------------------------------------- swig/qt.i
fk.QList = function(arr)
  return setmetatable(arr, {
    __index = {
      at = function(self, i) return self[i + 1] end,
      length = function(self) return #self end,
    }
  })
end

-- ---------------------------------------------------------------- swig/client.i (文件系统)
fk.QmlBackend_cd = function(path) __fk_cd(path) end
fk.QmlBackend_pwd = function() return __fk_pwd() end
fk.QmlBackend_exists = function(path) return __fk_exists(path) end
fk.QmlBackend_isDir = function(path) return __fk_isdir(path) end
fk.QmlBackend_ls = function(path)
  local ret = {}
  for entry in (__fk_ls(path) or ""):gmatch("[^\n]+") do ret[#ret + 1] = entry end
  table.sort(ret)
  return ret
end

-- ---------------------------------------------------------------- swig/player.i
fk.Player_Invalid = 0
fk.Player_Online = 1
fk.Player_Trust = 2
fk.Player_Run = 3
fk.Player_Leave = 4
fk.Player_Robot = 5
fk.Player_Offline = 6

-- 出站消息汇聚点。整局游戏的 doNotify / doRequest 全部落在这里。
-- 数据留在 Lua 侧（CBOR 字符串过不了 wasmoon 的 UTF-8 字符串边界），
-- 只把「有一条消息、多少字节」这个事实用数字穿过去。
local sink = {
  stream = {},      -- { {kind, connId, command, data, nbytes, batch} }
  batch = 0,        -- 由驱动在每次 ResumeRoom 边界递增：一次 flush 能合并成一条广播
}
fk._websink = sink

-- connId -> function(kind, command, cborString)：把某个座位的出站流接到本地客户端 VM
fk._webclients = {}

-- 线路层视图：把 CBOR 语义标签保留成普通数据，而不是让引擎的
-- tagged_decoders 把它们解析成活的 Card / Skill / Player / General 对象。
-- 不这么做的话，一条 177 字节的 MoveCards 解出来会牵出整个引擎对象图
-- （实测展开成 10.7 MB），fixtures 也就没法生成了。
local WIRE_TAGS = { 33001, 33002, 33003, 33004, 33005 }
local WIRE_OPTS = {}
for _, tag in ipairs(WIRE_TAGS) do
  WIRE_OPTS[tag] = function(v) return { __tag = tag, value = v } end
end
fk._wire_tags = WIRE_TAGS

local function emit(kind, connId, command, encoded)
  local n = #encoded
  local ok, decoded = pcall(cbor.decode, encoded, WIRE_OPTS)
  sink.stream[#sink.stream + 1] = {
    kind = kind,
    connId = connId,
    command = command,
    data = ok and decoded or encoded,
    nbytes = n,
    batch = sink.batch,
  }
  local client = fk._webclients[connId]
  if client then client(kind, command, encoded) end
  __fk_tick(kind, connId, command, n)
  return n
end
fk._webemit = emit

local _Player_MT = {
  __index = {
    getId = function(t) return t.id end,
    getScreenName = function(t) return t.screenName end,
    getAvatar = function(t) return t.avatar end,
    getTotalGameTime = function(t) return t.totalGameTime end,
    getGameData = function(t) return t.gameData end,
    getState = function(t) return t.state end,
  },
}

local _ServerPlayer_doRequest = function(self, command, jsondata, timeout, timestamp)
  timeout = math.ceil(timeout)
  assert(timestamp and math.type(timestamp) == "integer")
  emit("request", self.connId, command, tostring(jsondata))
end

local _ServerPlayer_waitForReply = function(self, timeout)
  local ret = __fk_wait_reply(self.connId, math.floor(timeout))
  if ret == nil then return "__cancel" end
  return ret
end

local _ServerPlayer_doNotify = function(self, command, jsondata)
  emit("notify", self.connId, command, tostring(jsondata))
end

local _ServerPlayer_MT = {
  __index = setmetatable({
    doRequest = _ServerPlayer_doRequest,
    waitForReply = _ServerPlayer_waitForReply,
    doNotify = _ServerPlayer_doNotify,

    thinking = function(t) return t._thinking end,
    setThinking = function(t, v) t._thinking = v end,
    setDied = function(t, v) t._died = v end,
    emitKick = function() end,

    saveState = function() return nil end,
    getSaveState = function() return nil end,
    saveGlobalState = function() return nil end,
    getGlobalSaveState = function() return nil end,
  }, _Player_MT),
}

fk.ServerPlayer = function(t)
  return setmetatable({
    connId = t.connId,
    id = t.id,
    screenName = t.screenName,
    avatar = t.avatar,
    totalGameTime = t.totalGameTime or 0,
    state = t.state,
    _thinking = false,
    _died = false,
    gameData = fk.QList(t.gameData or { 0, 0, 0 }),
  }, _ServerPlayer_MT)
end

-- ---------------------------------------------------------------- swig/server.i (Room)
local room_getOwner = function(self)
  for _, p in ipairs(self.players) do
    if p.id == self.ownerId then return p end
  end
end

local room_hasObserver = function(self, player)
  for _, p in ipairs(self.observers) do
    if p.id == player.id then return true end
  end
  return false
end

local _Room_MT = {
  __index = {
    getId = function(t) return t.id end,
    getPlayers = function(t) return t.players end,
    getOwner = room_getOwner,
    getObservers = function(t) return t.observers end,
    hasObserver = room_hasObserver,
    getTimeout = function(t) return t.timeout end,

    -- 浏览器里没有 Qt 的定时器；delay 由调用方 yield 处理，这里只记账。
    delay = function(t, ms) t._delay_total = (t._delay_total or 0) + math.floor(ms) end,
    setRequestTimer = function() end,
    destroyRequestTimer = function() end,

    updatePlayerWinRate = function() end,
    updateGeneralWinRate = function() end,
    gameOver = function(t) t._over = true end,

    increaseRefCount = function() end,
    decreaseRefCount = function() end,

    addNpc = function() error("addNpc unsupported in spike") end,
    removeNpc = function() end,

    settings = function(t) return t._settings end,
  }
}

fk.Room = function(t)
  local players = {}
  for _, obj in ipairs(t.players) do
    table.insert(players, fk.ServerPlayer(obj))
  end
  return setmetatable({
    id = t.id,
    players = fk.QList(players),
    ownerId = t.ownerId,
    observers = fk.QList({}),
    timeout = t.timeout,
    _settings = t.settings,
  }, _Room_MT)
end

-- 由 boot 侧填充：roomId -> fk.Room
fk._webrooms = {}

fk.RoomThread = function()
  return {
    getRoom = function(_, id) return fk._webrooms[id] end,
    isConsoleStart = function() return true end,
    isOutdated = function() return false end,
  }
end

fk.Server = function()
  return { getTask = function() return nil end }
end

fk._rpc_finished = false

return fk
