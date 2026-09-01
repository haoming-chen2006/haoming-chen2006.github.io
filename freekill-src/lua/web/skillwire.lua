-- skillwire.lua -- 把「锁定技」放到线路上。
--
-- WHY THIS EXISTS. 想把锁定技画得和普通技能不一样，线路上却找不到这个事实：
--
--   * Animate{type="InvokeSkill"} 只带 name / player / skill_type
--     （lua/lunarltk/server/room.lua:602、core/room/abstract_room.lua:97）；
--   * GetSkillData 报 active/notactive、limit、wake、quest 和换技名，
--     唯独不报 Skill.Compulsory（lua/client/client_util.lua:421）。
--
-- 于是唯一还剩的信号是「翻译之后的技能描述」的前缀 —— zh_CN 的「锁定技，」、
-- en_US 的 "(forced)"、vi_VN 的 "Tỏa định kỹ,"。从翻译过的散文里读游戏含义，
-- 是这个项目一直拒绝做的事：换一版翻译、多一个语言，判定就跟着变。
--
-- 权威只有一处，而且是引擎自己的：Skill:hasTag(Skill.Compulsory)
-- （lua/lunarltk/core/skill.lua:249）。它默认把觉醒技也算进锁定技 ——
-- 那正是引擎自己对「这技能由不得你」的定义，所以这里照抄，不另立标准；
-- 想区分觉醒技的，GetSkillData 本来就单独报 frequency = "wake"。
--
-- 服务端在发 Animate 的那一刻查一次，客户端在 GetSkillData 里查一次，
-- 查的是同一张 Fk.skills，所以没有第二个真相源。
--
-- packages/ 与 lua/ 是只读镜像，补丁只能打在这里。

local M = {}

--- 这个技能是不是锁定技（含觉醒技，与引擎口径一致）。
---@param name string? @ 技能名
---@return boolean
function M.isCompulsory(name)
  if type(name) ~= "string" then return false end
  local skill = (Fk.skills or Util.DummyTable)[name]
  if type(skill) ~= "table" or type(skill.hasTag) ~= "function" then return false end
  local ok, tagged = pcall(skill.hasTag, skill, Skill.Compulsory)
  return ok and tagged == true
end

--- 带技能名的两条动画，发出去时补上 compulsory。
---
--- 打在 boardgame 的 room_klass 上而不是 Fk.Base.ServerRoomBase 上：
--- ServerRoomBase 是个纯 mixin 表，Room:include 在加载时就把方法抄走了
--- （lua/lunarltk/server/room.lua:27），事后改基表对 Room 没有任何影响。
---@param room_klass table
local function installAnimate(room_klass)
  if type(room_klass) ~= "table" or type(room_klass.doAnimate) ~= "function" then return end
  if room_klass.__web_skillwire then return end
  room_klass.__web_skillwire = true

  local doAnimate = room_klass.doAnimate
  function room_klass:doAnimate(type_, data, players)
    if (type_ == "InvokeSkill" or type_ == "InvokeUltSkill")
      and type(data) == "table" and data.compulsory == nil then
      data.compulsory = M.isCompulsory(data.name)
    end
    return doAnimate(self, type_, data, players)
  end
end

--- 服务端：Animate 带上 compulsory。
function M.installHost()
  for _, game in pairs(Fk.boardgames or Util.DummyTable) do
    installAnimate(game.room_klass)
  end
end

--- 客户端：GetSkillData 带上 compulsory。
---
--- 包一层而不是重写：上游哪天自己补了这个字段，下面的 nil 判断就让路。
function M.installClient()
  if type(GetSkillData) ~= "function" then return end
  local getSkillData = GetSkillData
  ---@diagnostic disable-next-line: lowercase-global
  GetSkillData = function(skill_name)
    local d = getSkillData(skill_name)
    if type(d) == "table" and d.compulsory == nil then
      d.compulsory = M.isCompulsory(d.orig_skill or skill_name)
    end
    return d
  end
end

return M
