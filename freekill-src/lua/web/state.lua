-- state.lua -- 可移植的房间状态投影
--
-- 为什么不能直接对 room:serialize() 做摘要：它里面有三处预先 cbor.encode 过的
-- blob（RoomBase.serialize 的 banners、CardManager.serialize 的 card_marks、
-- Player.serialize 的 mark）。CBOR 编 map 时按 pairs 顺序写键，
-- 而 pairs 顺序取决于 Lua 的字符串哈希种子，那是随 JS 宿主变的。
-- 于是同一个房间在两个浏览器里会算出不同的摘要 —— 明明状态一模一样。
--
-- Agent 0 在 findings.md 里点名了这个坑：「游戏是可移植的，我的摘要不是。」
-- 这里把那三处 blob 解回表，剩下的交给 canon（它按键排序），
-- 摘要就只由数据决定了。

local M = {}

-- 与 fkhost 一致：把 CBOR 语义标签留成普通数据，
-- 不让引擎的 tagged_decoders 把它们还原成活的 Card / Skill / Player 对象。
-- 不这么做的话一条 177 字节的负载能展开成 10.7 MB。
local WIRE_TAGS = { 33001, 33002, 33003, 33004, 33005 }
local WIRE_OPTS = {}
for _, tag in ipairs(WIRE_TAGS) do
  WIRE_OPTS[tag] = function(v) return { __tag = tag, value = v } end
end
M.WIRE_OPTS = WIRE_OPTS

---@param s any
---@return any
local function decodeBlob(s)
  if type(s) ~= "string" then return s end
  local ok, v = pcall(cbor.decode, s, WIRE_OPTS)
  if ok and type(v) == "table" then return v end
  return s
end
M.decodeBlob = decodeBlob

--- room:serialize() 的可移植投影。
--- 覆盖的东西就是 serialize 覆盖的东西：每名角色的手牌 / 装备 / 判定区 / 属性 /
--- 标记 / 技能，以及牌堆、弃牌堆、处理区、废牌堆的完整顺序。
---@param room table
---@return table
function M.project(room)
  local o = room:serialize()
  o.banners = decodeBlob(o.banners)
  if type(o.card_manager) == "table" then
    o.card_manager.card_marks = decodeBlob(o.card_manager.card_marks)
  end
  for _, p in pairs(o.players or {}) do
    if type(p) == "table" then p.mark = decodeBlob(p.mark) end
  end
  return o
end

return M
