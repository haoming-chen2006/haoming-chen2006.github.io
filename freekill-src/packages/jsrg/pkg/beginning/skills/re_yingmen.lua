local yingmen = fk.CreateSkill {
  name = "re__yingmen",
  tags = { Skill.Compulsory },
}

local U = require "packages.utility.utility"

Fk:loadTranslationTable{
  ["re__yingmen"] = "盈门",
  [":re__yingmen"] = "锁定技，游戏开始时，将剩余武将牌堆顶四张武将牌置于你的武将牌上，称为“访客”；回合开始前，你可以将任意张“访客”置于"..
  "武将牌堆底，然后从剩余武将牌堆顶将“访客”补至四张。",

  ["#re__yingmen-recast"] = "盈门：你可以将任意张“访客”置于武将牌堆底，然后从牌堆顶补至四张",

  ["$re__yingmen1"] = "我乘轻舟访人间，人如江鲫逐功名！",
  ["$re__yingmen2"] = "一言难道千秋业，一纸雅评半世人。",
}

local function setFangke(player, is_start, is_death)
  local room = player.room
  local skills = {}
  for _, g in ipairs(player:getTableMark("@&js_fangke")) do
    local general = Fk.generals[g]
    for _, s in ipairs(general:getSkillNameList()) do
      local skill = Fk.skill_skels[s]
      if #skill.tags == 0 and
        not (player:hasSkill(s, true) and not player:isFakeSkill(Fk.skills[s])) then
        table.insertIfNeed(skills, s)
      end
    end
  end
  local fangke_skills = player:getTableMark("re_js_fangke_skills")
  if #fangke_skills > 0 then
    for _, skill in ipairs(fangke_skills) do
      if not table.contains(skills, skill) then
        player:loseFakeSkill(skill)
        Fk.skill_skels[skill]:onLose(player, is_death)
      end
    end
  end
  if #skills > 0 then
    for _, skill in ipairs(skills) do
      if not table.contains(fangke_skills, skill) then
        player:addFakeSkill(skill)
        player:prelightSkill(skill, true)
        Fk.skill_skels[skill]:onAcquire(player, is_start)
      end
    end
  end
  room:setPlayerMark(player, "re_js_fangke_skills", skills)
end

yingmen:addEffect(fk.GameStart, {
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(yingmen.name) and #player.room.general_pile > 0
  end,
  on_use = function (self, event, target, player, data)
    local room = player.room
    local generals = {}
    for i = 1, math.min(#room.general_pile, 4) do
      local general = room.general_pile[i]
      table.insert(generals, general)
      room:findGeneral(general)
    end
    local mark = player:getTableMark("@&js_fangke")
    table.insertTable(mark, generals)
    room:setPlayerMark(player, "@&js_fangke", mark)
    if player:hasSkill("re__pingjian", true) then
      setFangke(player, true)
    end
  end,
})

yingmen:addEffect(fk.TurnStart, {
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(yingmen.name)
  end,
  on_use = function (self, event, target, player, data)
    local room = player.room
    local mark = player:getTableMark("@&js_fangke")
    if #mark > 0 then
      local generals, choice = U.askToChooseGeneralsAndChoice(player, {
        skill_name = yingmen.name,
        generals = player:getTableMark("@&js_fangke"),
        cancel_options = {"Cancel"},
        prompt = "#re__yingmen-recast",
      })
      if choice == "OK" then
        for _, general in ipairs(generals) do
          table.removeOne(mark, general)
        end
        room:returnToGeneralPile(generals, "bottom")
      end
    end
    if #mark < 4 then
      for i = 1, math.min(#room.general_pile, 4 - #mark) do
        local general = room.general_pile[i]
        table.insert(mark, general)
        room:findGeneral(general)
      end
    end
    room:setPlayerMark(player, "@&js_fangke", mark)
    if player:hasSkill("re__pingjian", true) then
      setFangke(player)
    end
  end,
})

yingmen:addLoseEffect(function (self, player, is_death)
  local room = player.room
  if player:getMark("@&js_fangke") ~= 0 then
    for _, general in ipairs(player:getMark("@&js_fangke")) do
      room:returnToGeneralPile({general})
    end
    room:setPlayerMark(player, "@&js_fangke", 0)
  end
  setFangke(player, false, is_death)
end)

return yingmen
