-- fkhost.lua -- 浏览器版的 lua/server/rpc/fk.lua（服务端 VM 用）
--
-- 这是一个 overlay，绝不修改 /Users/haoming/FreeKill/lua 下的任何文件。
-- 与 rpc 版的唯一区别：callRpc 的 stdio + json-rpc 传输换成了进程内的数据结构，
-- socket.gettime 换成可注入的虚拟时钟，lfs 换成宿主的虚拟文件系统。
--
-- 从 JS 注入的全局（全部同步、全部只搬数字或短字符串）：
--   __fk_log(level, msg)
--   __fk_now_us() -> integer
--   __fk_ls(path) -> string  (换行分隔)
--   __fk_pwd() -> string
--   __fk_cd(path)
--   __fk_exists(path) -> boolean
--   __fk_isdir(path) -> boolean
--
-- 出站消息不再逐条过边界：全部落进 sink，由 FKHost.flush() 一次性交出去。

local fk = {}

-- ---------------------------------------------------------------- 时钟
-- 全部走宿主的虚拟单调时钟，这是可重放的前提。
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

-- ---------------------------------------------------------------- 出站汇聚点
-- 整局游戏的 doNotify / doRequest 全部落在这里。负载保持为原始 CBOR 串，
-- 只在 flush 时 base64 一次。
local sink = {
  msgs = {},   -- { {seq, batch, kind, connId, command, payload} }
  seq = 0,
  batch = 0,   -- 由驱动在每次 ResumeRoom 边界递增：一批可以合并成一次广播
  cursor = 0,  -- 已交给 JS 的位置
  bytes = 0,
}
fk._sink = sink

-- connId -> 该座位的待回复队列（先进先出的原始 CBOR 串）
fk._replies = {}

local function emit(kind, connId, command, encoded)
  local n = #encoded
  sink.seq = sink.seq + 1
  sink.bytes = sink.bytes + n
  sink.msgs[sink.seq] = {
    seq = sink.seq,
    batch = sink.batch,
    kind = kind,
    connId = connId,
    command = command,
    payload = encoded,
  }
  return n
end
fk._emit = emit

local _Player_MT = {
  __index = {
    getId = function(t) return t.id end,
    getScreenName = function(t) return t.screenName end,
    getAvatar = function(t) return t.avatar end,
    getTotalGameTime = function(t) return t.totalGameTime end,
    getGameData = function(t) return t.gameData end,
    getState = function(t) return t.state end,
    setState = function(t, v) t.state = v end,
  },
}

local _ServerPlayer_MT = {
  __index = setmetatable({
    doRequest = function(self, command, jsondata, timeout, timestamp)
      timeout = math.ceil(timeout)
      assert(timestamp and math.type(timestamp) == "integer")
      emit("request", self.connId, command, tostring(jsondata))
    end,

    waitForReply = function(self, _timeout)
      local q = fk._replies[self.connId]
      if not q or #q == 0 then return "__notready" end
      return table.remove(q, 1)
    end,

    doNotify = function(self, command, jsondata)
      emit("notify", self.connId, command, tostring(jsondata))
    end,

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
local _Room_MT = {
  __index = {
    getId = function(t) return t.id end,
    getPlayers = function(t) return t.players end,
    getOwner = function(self)
      for _, p in ipairs(self.players) do
        if p.id == self.ownerId then return p end
      end
    end,
    getObservers = function(t) return t.observers end,
    hasObserver = function(self, player)
      for _, p in ipairs(self.observers) do
        if p.id == player.id then return true end
      end
      return false
    end,
    getTimeout = function(t) return t.timeout end,

    -- 浏览器里没有 Qt 定时器；delay 由调度侧的虚拟时钟处理，这里只记账。
    delay = function(t, ms) t._delay_total = (t._delay_total or 0) + math.floor(ms) end,
    setRequestTimer = function(t, ms) t._request_timer = math.floor(ms) end,
    destroyRequestTimer = function(t) t._request_timer = nil end,

    updatePlayerWinRate = function() end,
    updateGeneralWinRate = function() end,
    gameOver = function(t) t._over = true end,

    increaseRefCount = function() end,
    decreaseRefCount = function() end,

    addNpc = function(t)
      t._npc_seq = (t._npc_seq or 0) + 1
      local id = -t._npc_seq
      local p = fk.ServerPlayer {
        connId = id, id = id, screenName = "bot" .. t._npc_seq,
        avatar = "guojia", state = fk.Player_Robot,
      }
      return p
    end,
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

-- roomId -> fk.Room，由 FKHost 填充
fk._rooms = {}

fk.RoomThread = function()
  return {
    getRoom = function(_, id) return fk._rooms[id] end,
    isConsoleStart = function() return false end,
    isOutdated = function() return false end,
  }
end

fk.Server = function()
  return { getTask = function() return nil end }
end

fk._rpc_finished = false

return fk
