local bazhen = fk.CreateSkill {
  name = "bazhen",
  tags = {Skill.Compulsory},
}

Fk:loadTranslationTable{
  ["bazhen"] = "八阵",
  [":bazhen"] = "锁定技，若你没有装备防具，视为你装备着【八卦阵】。",

  ["$bazhen1"] = "你可识得此阵？",
  ["$bazhen2"] = "太极生两仪，两仪生四象，四象生八卦。",
}

local spec = {
  on_use = function(self, event, target, player, data)
    local room = player.room
    room:broadcastPlaySound("./packages/standard_cards/audio/card/eight_diagram")
    room:setEmotion(player, "./packages/standard_cards/image/anim/eight_diagram")
    local skill = Fk.skills["#eight_diagram_skill"]
    skill:use(event, target, player, data)
  end,
}

bazhen:addEffect(fk.AskForCardUse, {
  anim_type = "defensive",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(bazhen.name) and not player:isFakeSkill(self) and
      (data.pattern and Exppattern:Parse(data.pattern):matchExp("jink|0|nosuit|none")) and
      #player:getEquipments(Card.SubtypeArmor) == 0 and not player:prohibitUse(Fk:cloneCard("jink")) 
      and (data.extraData == {} or data.extraData.not_passive ~= true) and
      Fk.skills["#eight_diagram_skill"] ~= nil and Fk.skills["#eight_diagram_skill"]:isEffectable(player)
  end,
  on_cost = function(self, event, target, player, data)
    return player.room:askToSkillInvoke(player, {
      skill_name = bazhen.name,
    })
  end,
  on_use = spec.on_use,
})

bazhen:addEffect(fk.AskForCardResponse, {
  anim_type = "defensive",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(bazhen.name) and not player:isFakeSkill(self) and
      Exppattern:Parse(data.pattern):matchExp("jink|0|nosuit|none") and
      not player:prohibitResponse(Fk:cloneCard("jink")) and
      not player:getEquipment(Card.SubtypeArmor)
      and Fk.skills["#eight_diagram_skill"] ~= nil and Fk.skills["#eight_diagram_skill"]:isEffectable(player)
  end,
  on_cost = function(self, event, target, player, data)
    return player.room:askToSkillInvoke(player, {
      skill_name = bazhen.name,
    })
  end,
  on_use = spec.on_use,
})

bazhen:addAI(Fk.Ltk.AI.newInvokeStrategy{
  think = function(self, ai)
    return ai:getBenefitOfEvents(function(logic)
      logic:judge({
        who = ai.player,
        reason = "#eight_diagram_skill",
        pattern = ".",
      })
    end) >= -100
  end,
})

return bazhen
