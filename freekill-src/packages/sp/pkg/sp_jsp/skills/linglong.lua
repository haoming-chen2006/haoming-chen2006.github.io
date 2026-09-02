local linglong = fk.CreateSkill {
  name = "linglong",
  tags = { Skill.Compulsory },
}

Fk:loadTranslationTable{
  ["linglong"] = "玲珑",
  [":linglong"] = "锁定技，若你的装备区没有防具牌，视为你装备着【八卦阵】；若你的装备区没有坐骑牌，你的手牌上限+1；若你的装备区没有宝物牌，"..
  "视为你拥有技能〖奇才〗。",

  ["$linglong1"] = "哼～书中自有玲珑心～",
  ["$linglong2"] = "哼～自然是多多益善咯～",
}

local linglong_on_use = function (self, event, target, player, data)
  local room = player.room
  room:broadcastPlaySound("./packages/standard_cards/audio/card/eight_diagram")
  room:setEmotion(player, "./packages/standard_cards/image/anim/eight_diagram")
  local skill = Fk.skills["#eight_diagram_skill"]
  skill:use(event, target, player, data)
end
linglong:addEffect(fk.AskForCardUse, {
  anim_type = "defensive",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(linglong.name) and not player:isFakeSkill(self) and
      (data.pattern and Exppattern:Parse(data.pattern):matchExp("jink|0|nosuit|none")) and
      #player:getEquipments(Card.SubtypeArmor) == 0 and not player:prohibitUse(Fk:cloneCard("jink")) 
      and (data.extraData == {} or data.extraData.not_passive ~= true) and
      Fk.skills["#eight_diagram_skill"] ~= nil and Fk.skills["#eight_diagram_skill"]:isEffectable(player)
  end,
  on_cost = function(self, event, target, player, data)
    return player.room:askToSkillInvoke(player, {
      skill_name = linglong.name,
    })
  end,
  on_use = linglong_on_use,
})
linglong:addEffect(fk.AskForCardResponse, {
  anim_type = "defensive",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(linglong.name) and not player:isFakeSkill(self) and
      (data.pattern and Exppattern:Parse(data.pattern):matchExp("jink|0|nosuit|none")) and
      #player:getEquipments(Card.SubtypeArmor) == 0 and not player:prohibitResponse(Fk:cloneCard("jink")) and
      Fk.skills["#eight_diagram_skill"] ~= nil and Fk.skills["#eight_diagram_skill"]:isEffectable(player)
  end,
  on_cost = function(self, event, target, player, data)
    return player.room:askToSkillInvoke(player, {
      skill_name = linglong.name,
    })
  end,
  on_use = linglong_on_use,
})
linglong:addEffect("targetmod", {
  bypass_distances = function(self, player, skill, card)
    return player:hasSkill(linglong.name) and #player:getEquipments(Card.SubtypeTreasure) == 0 and
      card and card.type == Card.TypeTrick
  end,
})
linglong:addEffect("maxcards", {
  correct_func = function(self, player)
    if player:hasSkill(linglong.name) and
      #player:getEquipments(Card.SubtypeOffensiveRide) + #player:getEquipments(Card.SubtypeDefensiveRide) == 0 then
      return 1
    end
  end,
})

return linglong
