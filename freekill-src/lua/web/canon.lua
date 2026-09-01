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

-- ---------------------------------------------------------------- 活对象
--
-- 带 __tocbor 的表有两类，必须分清楚，而且只能按元表身份认，不能按字段形状猜。
--
--   * cbor 自己的包装：simple {value,name,cbor} 和 tagged {tag,value}；
--   * 引擎的活对象：Player / Card / Skill / General，四个类都定义了 __tocbor，
--     middleclass 会把它抄进每个子类的实例元表，所以 rawget 也找得到。
--
-- 原来是按「有没有 name/value/tag 字段」猜的，而 Player 自己就有一个叫 tag 的
-- 表字段（lua/lunarltk/core/player.lua:107）。于是一个活的 Player 被当成 cbor
-- tagged，tostring(那张表) 拼进了 JSON：{"__tag":table: 0x…}。JSON.parse 一炸，
-- drainUI 整批 UI 事件全丢，那个座位从此收不到任何东西 —— 一局里见过 137 次。
local cbor_mts

--- cbor 的 simple / tagged 元表。cbor 是引擎装的全局，比本文件晚，所以懒取。
---@return table? simple_mt
---@return table? tagged_mt
local function cborMts()
  if cbor_mts == nil then
    if type(cbor) ~= "table" or type(cbor.tagged) ~= "function" then return nil, nil end
    cbor_mts = { getmetatable(cbor.null), getmetatable(cbor.tagged(0, 0)) }
  end
  return cbor_mts[1], cbor_mts[2]
end

-- 解码时把任意语义标签留成 {__tag, value} 的普通数据，而不是让引擎的
-- tagged_decoders 把它还原成活对象（那正好是我们要摆脱的东西）。
-- 键是标签号，所以 opts.more 之类的非数字键取到 nil，cbor.decode 的其它约定不受影响。
local TAG_TO_REF = setmetatable({}, {
  __index = function(_, tag)
    if type(tag) ~= "number" then return nil end
    return function(v) return { __tag = tag, value = v } end
  end,
})

--- 活对象按它自己 __tocbor 定义的语义标签发出去，也就是 contract/protocol.ts
--- 里的 TaggedRef。线路上只留 {__tag, value}，房间拿到再回头问 VM 要数据
--- （src/engine/luaClient.ts 的 resolve）。
---
--- 这比原来那个 "<obj:BasicCard>" 字符串多的不是格式而是内容：那个字符串把
--- 「是哪一张牌」整个丢了，ShowVirtualCard 每局都在丢。
---@param x table
---@param tocbor function
---@return table? @ {__tag=<int>, value=<any>}，取不到就 nil
local function taggedRef(x, tocbor)
  if type(cbor) ~= "table" then return nil end
  local ok, bytes = pcall(tocbor, x)
  if not ok or type(bytes) ~= "string" then return nil end
  local ok2, ref = pcall(cbor.decode, bytes, TAG_TO_REF)
  if not ok2 or type(ref) ~= "table" or type(rawget(ref, "__tag")) ~= "number" then return nil end
  return ref
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
      -- JSON 没有 inf / nan，%.14g 会写出 inf、-inf、nan —— 三个不是 JSON 的
      -- 词。走到线路上就是整批 UI 事件被 JSON.parse 拒掉。按这个文件里已有的
      -- 惯例（cbor 的 __null / __undefined）标成字符串，revive 认得回去。
      if x ~= x then return '"__nan"' end
      if x == math.huge then return '"__inf"' end
      if x == -math.huge then return '"__-inf"' end
      return string.format("%.14g", x)
    end
    if t == "string" then return quote(x) end
    if t ~= "table" then return quote("<" .. t .. ">") end

    -- cbor 的 simple / tagged 包装：折叠成朴素形式；引擎的活对象：折成 TaggedRef
    local mt = getmetatable(x)
    local tocbor = mt and rawget(mt, "__tocbor")
    if tocbor then
      local simple_mt, tagged_mt = cborMts()
      if mt == simple_mt then
        local nm = rawget(x, "name")
        if nm ~= nil then return quote("__" .. tostring(nm)) end
        return quote("__simple:" .. tostring(rawget(x, "value")))
      end
      if mt == tagged_mt then
        return '{"__tag":' .. enc(rawget(x, "tag"), depth + 1)
          .. ',"value":' .. enc(rawget(x, "value"), depth + 1) .. '}'
      end
      local ref = taggedRef(x, tocbor)
      if ref then return enc(ref, depth + 1) end
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

--- canon.encode 的逆：把从 JS 那边 JSON.parse 回来的普通数据还原成 Lua 值。
---
--- 只处理 encode 会引入的四种失真：
---   * "__bytes:<hex>"     —— 非 UTF-8 字节串
---   * "__inf"/"__nan" 等  —— JSON 表示不了的浮点
---   * {__tag=n, value=v}  —— CBOR 语义标签（33001..33005）
---   * "1" 之类的数字键    —— encode 把所有键都字符串化了
--- 浮点会退化成整数（%.14g 写 2.0 是 "2"）；实测的回复里没有浮点，
--- 若哪天有了，逐边界的摘要比对会立刻叫出来，而不是悄悄漂移。
---@param v any
---@return any
local NONFINITE = { ["__inf"] = math.huge, ["__-inf"] = -math.huge, ["__nan"] = 0 / 0 }
function M.revive(v)
  local t = type(v)
  if t == "string" then
    local nf = NONFINITE[v]
    if nf ~= nil then return nf end
    local hex = v:match("^__bytes:(%x*)$")
    if hex then
      return (hex:gsub("%x%x", function(c) return string.char(tonumber(c, 16)) end))
    end
    return v
  end
  if t ~= "table" then return v end

  local tag = rawget(v, "__tag")
  if tag ~= nil and rawget(v, "value") ~= nil then
    local n = 0
    for _ in pairs(v) do n = n + 1 end
    if n == 2 then return cbor.tagged(tag, M.revive(v.value)) end
  end

  local out = {}
  for k, val in pairs(v) do
    if type(k) == "string" and k:match("^%-?%d+$") then
      out[math.tointeger(tonumber(k)) or k] = M.revive(val)
    else
      out[k] = M.revive(val)
    end
  end
  return out
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
