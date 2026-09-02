local pingjian = fk.CreateSkill {
  name = "js__pingjian",
}

local U = require "packages.utility.utility"

Fk:loadTranslationTable{
  ["js__pingjian"] = "评鉴",
  [":js__pingjian"] = "当“访客”的无类型标签或者只有锁定技标签的技能满足发动时机时，你可以发动该技能。此技能的效果结束后，"..
  "你须移除一张“访客”，若移除的是含有该技能的“访客”，你摸一张牌。",

  ["#js__pingjian-choice"] = "评鉴：移除一张访客，若移除 %arg 则摸牌",

  ["$js__pingjian1"] = "太丘道广，广则不周。仲举性峻，峻则少通。",
  ["$js__pingjian2"] = "君生清平则为奸逆，处乱世当居豪雄。",
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

pingjian:addEffect(fk.AfterSkillEffect, {
  anim_type = "drawcard",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(pingjian.name) and
      #player:getTableMark("@&js_fangke") > 0 and
      not data.skill.is_delay_effect and
      table.contains(player:getTableMark("js_fangke_skills"), data.skill:getSkeleton().name)
  end,
  on_cost = Util.TrueFunc,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local choices = player:getMark("@&js_fangke")
    local owner = table.find(choices, function (name)
      local general = Fk.generals[name]
      return table.contains(general:getSkillNameList(), data.skill:getSkeleton().name)
    end) or "?"
    if #choices > 1 then
      choices = U.askToChooseGeneralsAndChoice(player, {
        skill_name = pingjian.name,
        generals = choices,
        max_num = 1,
        prompt = "#js__pingjian-choice:::"..owner,
      })
    end
    local choice = choices[1]
    room:removeTableMark(player, "@&js_fangke", choice)
    room:returnToGeneralPile({choice})
    setFangke(player)
    if choice == owner and not player.dead then
      player:drawCards(1, pingjian.name)
    end
  end,
})

pingjian:addEffect(fk.SkillEffect, {
  can_refresh = function (self, event, target, player, data)
    return target == player and table.contains(player:getTableMark("js_fangke_skills"), data.skill:getSkeleton().name)
  end,
  on_refresh = function (self, event, target, player, data)
    local room = player.room
    for _, s in ipairs(Fk.skills[data.skill:getSkeleton().name].related_skills) do
      if s:isInstanceOf(StatusSkill) then
        room:addSkill(s)
      end
    end
  end,
})

pingjian:addAcquireEffect(function (self, player, is_start)
  setFangke(player, is_start, false)
end)
pingjian:addLoseEffect(function (self, player, is_death)
  setFangke(player, false, is_death)
end)

pingjian:addEffect(fk.EventAcquireSkill, {
  can_refresh = function (self, event, target, player, data)
    return target == player and table.contains(player:getTableMark("js_fangke_skills"), data.skill.name)
  end,
  on_refresh = function (self, event, target, player, data)
    setFangke(player)
  end,
})

pingjian:addEffect(fk.EventLoseSkill, {
  can_refresh = function (self, event, target, player, data)
    return target == player and table.contains(player:getTableMark("js_fangke_skills"), data.skill.name)
  end,
  on_refresh = function (self, event, target, player, data)
    setFangke(player)
  end,
})

pingjian:addEffect("invalidity", {
  recheck_invalidity = true,
  invalidity_func = function (self, from, skill)
    return not from:hasSkill(pingjian.name) and from:getMark("js_fangke_skills") ~= 0 and
      table.contains(from:getTableMark("js_fangke_skills"), skill.name)
  end,
})

return pingjian
