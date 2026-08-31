-- canon.lua -- 确定性的序列化与摘要，用于比较两次运行 / 重放的状态
--
-- 规则：键按 (类型, 值) 排序；含非可打印字节的字符串转十六进制；
-- 浮点固定格式；共享子表做结果记忆化（游戏数据是 DAG，不记忆化会指数爆炸）。

local M = {}

local function isArray(t)
  local n = #t
  if n == 0 then return next(t) == nil end
  local count = 0
  for k in pairs(t) do
    if type(k) ~= "number" or k < 1 or k > n or k % 1 ~= 0 then return false end
    count = count + 1
  end
  return count == n
end

local ESC = {
  ['"'] = '\\"', ['\\'] = '\\\\',
  ['\b'] = '\\b', ['\f'] = '\\f', ['\n'] = '\\n', ['\r'] = '\\r', ['\t'] = '\\t',
}

local function hex(s)
  return (s:gsub('.', function(c) return string.format("%02x", c:byte()) end))
end

-- 输出必须是合法 JSON：有效 UTF-8 原样透传（GameLog 里全是中文），
-- 非 UTF-8 的二进制串（比如内嵌的 CBOR）标成 __bytes: 前缀的十六进制。
local function quote(s)
  if not utf8.len(s) then
    return '"__bytes:' .. hex(s) .. '"'
  end
  local out = s:gsub('[%z\1-\31"\\]', function(c)
    return ESC[c] or string.format('\\u%04x', c:byte())
  end)
  return '"' .. out .. '"'
end

local function keyrank(k)
  local t = type(k)
  if t == "number" then return 0 end
  if t == "string" then return 1 end
  return 2
end

local function keyless(a, b)
  local ra, rb = keyrank(a), keyrank(b)
  if ra ~= rb then return ra < rb end
  if ra == 2 then return tostring(a) < tostring(b) end
  return a < b
end

---@param v any
---@return string
function M.encode(v)
  local memo = {}      -- table -> 已算好的字符串（共享子树只算一次）
  local path = {}      -- 当前路径上的表，用于环检测

  local function enc(x, depth)
    local t = type(x)
    if x == nil then return "null" end
    if t == "boolean" then return x and "true" or "false" end
    if t == "number" then
      if math.type(x) == "integer" then return tostring(x) end
      return string.format("%.14g", x)
    end
    if t == "string" then return quote(x) end
    if t ~= "table" then return quote("<" .. t .. ">") end

    -- cbor 的 simple / tagged 包装：折叠成朴素形式
    local mt = getmetatable(x)
    if mt and rawget(mt, "__tocbor") then
      local nm = rawget(x, "name")
      if nm ~= nil and rawget(x, "value") ~= nil then return quote("__" .. tostring(nm)) end
      local tg = rawget(x, "tag")
      if tg ~= nil then
        return '{"__tag":' .. tostring(tg) .. ',"value":' .. enc(rawget(x, "value"), depth + 1) .. '}'
      end
      return quote("<obj:" .. tostring(rawget(x, "class") and rawget(rawget(x, "class"), "name") or "?") .. ">")
    end

    if path[x] then return '"<cycle>"' end
    local hit = memo[x]
    if hit then return hit end
    if depth > 64 then return '"<deep>"' end

    path[x] = true
    local buf = {}
    if isArray(x) then
      for i = 1, #x do buf[#buf + 1] = enc(x[i], depth + 1) end
      buf = "[" .. table.concat(buf, ",") .. "]"
    else
      local keys = {}
      for k in pairs(x) do keys[#keys + 1] = k end
      table.sort(keys, keyless)
      for _, k in ipairs(keys) do
        buf[#buf + 1] = quote(tostring(k)) .. ":" .. enc(x[k], depth + 1)
      end
      buf = "{" .. table.concat(buf, ",") .. "}"
    end
    path[x] = nil
    memo[x] = buf
    return buf
  end

  return enc(v, 0)
end

--- 严格的 Lua 字面量序列化：只接受纯数据。
--- 遇到带元表的活对象就报错 —— 那本身就是「回放日志不是纯数据」的结论。
function M.lua_literal(v)
  local buf = {}
  local function w(x, depth)
    local t = type(x)
    if x == nil then buf[#buf + 1] = "nil"
    elseif t == "boolean" then buf[#buf + 1] = tostring(x)
    elseif t == "number" then
      if math.type(x) == "integer" then buf[#buf + 1] = tostring(x)
      else buf[#buf + 1] = string.format("%.17g", x) end
    elseif t == "string" then
      buf[#buf + 1] = string.format("%q", x)
    elseif t == "table" then
      if depth > 40 then error("lua_literal: too deep", 0) end
      if getmetatable(x) ~= nil then
        error("lua_literal: table with metatable (live engine object?)", 0)
      end
      buf[#buf + 1] = "{"
      local keys = {}
      for k in pairs(x) do keys[#keys + 1] = k end
      table.sort(keys, keyless)
      for _, k in ipairs(keys) do
        if type(k) == "number" and math.type(k) == "integer" then
          buf[#buf + 1] = "[" .. k .. "]="
        elseif type(k) == "string" then
          buf[#buf + 1] = "[" .. string.format("%q", k) .. "]="
        else
          error("lua_literal: unsupported key type " .. type(k), 0)
        end
        w(x[k], depth + 1)
        buf[#buf + 1] = ","
      end
      buf[#buf + 1] = "}"
    else
      error("lua_literal: unsupported value type " .. t, 0)
    end
  end
  w(v, 0)
  return table.concat(buf)
end

-- FNV-1a 64
local FNV_OFFSET <const> = 0xcbf29ce484222325
local FNV_PRIME <const> = 0x100000001b3

---@param s string
---@return string 16 位十六进制
function M.hash(s)
  local h = FNV_OFFSET
  for i = 1, #s do
    h = h ~ s:byte(i)
    h = h * FNV_PRIME
  end
  return string.format("%016x", h)
end

function M.digest(v)
  return M.hash(M.encode(v))
end

return M
