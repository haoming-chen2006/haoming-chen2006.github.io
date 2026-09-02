local yingmen = fk.CreateSkill {
  name = "yingmen",
  tags = { Skill.Compulsory },
}

Fk:loadTranslationTable{
  ["yingmen"] = "盈门",
  [":yingmen"] = "锁定技，游戏开始时，你在剩余武将牌堆中随机获得四张武将牌置于你的武将牌上，称为“访客”；回合开始前，若你的“访客”数少于四张，"..
  "则你从剩余武将牌堆中将“访客”补至四张。",

  ["@&js_fangke"] = "访客",

  ["$yingmen1"] = "韩侯不顾？德高，门楣自盈。",
  ["$yingmen2"] = "贫而不阿，名广，胜友满座。",
}

local function setFangke(player, is_start, is_death)
  local room = player.room
  local skills = {}
  for _, g in ipairs(player:getTableMark("@&js_fangke")) do
    local general = Fk.generals[g]
    for _, s in ipairs(general:getSkillNameList()) do
      local skill = Fk.skill_skels[s]
      if (#skill.tags == 0 or (#skill.tags == 1 and skill.tags[1] == Skill.Compulsory)) and
        not (player:hasSkill(s, true) and not player:isFakeSkill(Fk.skills[s])) then
        table.insertIfNeed(skills, s)
      end
    end
  end
  local fangke_skills = player:getTableMark("js_fangke_skills")
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
  room:setPlayerMark(player, "js_fangke_skills", skills)
end

yingmen:addEffect(fk.GameStart, {
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(yingmen.name) and #player.room.general_pile > 0
  end,
  on_use = function (self, event, target, player, data)
    local room = player.room
    local generals = room:tableRandomPick(room.general_pile, 4)
    for _, general in ipairs(generals) do
      room:findGeneral(general)
    end
    local mark = player:getTableMark("@&js_fangke")
    table.insertTable(mark, generals)
    room:setPlayerMark(player, "@&js_fangke", mark)
    if player:hasSkill("js__pingjian", true) then
      setFangke(player, true)
    end
  end,
})

yingmen:addEffect(fk.TurnStart, {
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(yingmen.name) and #player:getTableMark("@&js_fangke") < 4 and
      #player.room.general_pile > 0
  end,
  on_use = function (self, event, target, player, data)
    local room = player.room
    local generals = room:tableRandomPick(room.general_pile, 4 - #player:getTableMark("@&js_fangke"))
    for _, general in ipairs(generals) do
      room:findGeneral(general)
    end
    local mark = player:getTableMark("@&js_fangke")
    table.insertTable(mark, generals)
    room:setPlayerMark(player, "@&js_fangke", mark)
    if player:hasSkill("js__pingjian", true) then
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
