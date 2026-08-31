-- fkclient.lua -- 浏览器版的客户端 fk 表（主线程 VM 用）
--
-- 只提供 lua/freekill.lua 与 lua/client/** 需要的那一小片 SWIG 面。
-- 服务端那半边（fk.Room / fk.ServerPlayer / RoomThread）在这里完全不存在，
-- 这是主线程 VM 与 Worker VM 的边界。

local fk = {}

local now_us = __fk_now_us

---@return integer
function fk.GetMicroSecond()
  return math.floor(now_us())
end

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

function fk.GetDisabledPacks()
  return "[]"
end

fk.QList = function(arr)
  return setmetatable(arr, {
    __index = {
      at = function(self, i) return self[i + 1] end,
      length = function(self) return #self end,
    }
  })
end

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

fk.Player_Invalid = 0
fk.Player_Online = 1
fk.Player_Trust = 2
fk.Player_Run = 3
fk.Player_Leave = 4
fk.Player_Robot = 5
fk.Player_Offline = 6

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

---@param id integer
function fk.newPlayer(id, name, avatar, state)
  return setmetatable({
    id = id,
    screenName = name or ("player" .. id),
    avatar = avatar or "guojia",
    state = state or fk.Player_Online,
    died = false,
    thinking = false,
    gameData = { 0, 0, 0 },
  }, PlayerMT)
end

return fk
