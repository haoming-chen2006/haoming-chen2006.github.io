-- b64.lua -- Lua <-> JS 之间搬运二进制负载
--
-- 引擎的线路负载是 CBOR 二进制串。wasmoon 在 Lua/JS 边界上按 UTF-8 解字符串，
-- 二进制串过去就废了，所以出站/入站的负载一律走 base64。
-- JS 侧不解 CBOR：它只是把不透明的字节搬到对端的客户端 VM 里去。

local M = {}

local ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"

-- 单字符查表，避免在热路径上反复做 string.sub
local ENC = {}
for i = 0, 63 do ENC[i] = ALPHA:sub(i + 1, i + 1) end
local DEC = {}
for i = 0, 63 do DEC[ALPHA:byte(i + 1)] = i end
DEC[61] = 0 -- '='

local byte, char, concat = string.byte, string.char, table.concat

---@param s string
---@return string
function M.encode(s)
  local n = #s
  local out = {}
  local j = 0
  local i = 1
  while i + 2 <= n do
    local a, b, c = byte(s, i, i + 2)
    local v = a * 65536 + b * 256 + c
    j = j + 1
    out[j] = ENC[(v >> 18) & 63] .. ENC[(v >> 12) & 63] .. ENC[(v >> 6) & 63] .. ENC[v & 63]
    i = i + 3
  end
  local rest = n - i + 1
  if rest == 1 then
    local v = byte(s, i) << 16
    out[j + 1] = ENC[(v >> 18) & 63] .. ENC[(v >> 12) & 63] .. "=="
  elseif rest == 2 then
    local a, b = byte(s, i, i + 1)
    local v = (a << 16) | (b << 8)
    out[j + 1] = ENC[(v >> 18) & 63] .. ENC[(v >> 12) & 63] .. ENC[(v >> 6) & 63] .. "="
  end
  return concat(out)
end

---@param s string
---@return string
function M.decode(s)
  s = s:gsub("[^A-Za-z0-9+/=]", "")
  local pad = 0
  if s:sub(-2) == "==" then pad = 2 elseif s:sub(-1) == "=" then pad = 1 end
  local out = {}
  local j = 0
  for i = 1, #s, 4 do
    local a, b, c, d = byte(s, i, i + 3)
    local v = ((DEC[a] or 0) << 18) | ((DEC[b] or 0) << 12) | ((DEC[c] or 0) << 6) | (DEC[d] or 0)
    j = j + 1
    out[j] = char((v >> 16) & 255, (v >> 8) & 255, v & 255)
  end
  local res = concat(out)
  if pad > 0 then res = res:sub(1, #res - pad) end
  return res
end

return M
