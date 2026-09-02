local guixin = fk.CreateSkill {
  name = "guixin",
}

Fk:loadTranslationTable{
  ["guixin"] = "归心",
  [":guixin"] = "当你受到1点伤害后，你可获得所有其他角色区域中的一张牌，然后你翻面。",

  ["$guixin1"] = "周公吐哺，天下归心！",
  ["$guixin2"] = "山不厌高，海不厌深！",
}

guixin:addEffect(fk.Damaged, {
  anim_type = "masochism",
  can_trigger = function (self, event, target, player, data)
    return target == player and player:hasSkill(guixin.name) and table.find(player.room.alive_players, function (p)
      return p ~= player and not p:isAllNude()
    end)
  end,
  trigger_times = function(self, event, target, player, data)
    return data.damage
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    if room:askToSkillInvoke(player, {
      skill_name = guixin.name,
    }) then
      event:setCostData(self, {tos = room:getOtherPlayers(player, false)})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    for _, p in ipairs(room:getOtherPlayers(player)) do
      if not p.dead and not p:isAllNude() then
        local id = room:askToChooseCard(player, {
          target = p,
          flag = "hej",
          skill_name = guixin.name,
        })
        room:obtainCard(player, id, false, fk.ReasonPrey, player, guixin.name)
        if player.dead then return end
      end
    end
    player:turnOver()
  end,
})

guixin:addAI(Fk.Ltk.AI.newInvokeStrategy{
  think = function(self, ai)
    local player = ai.player
    return ai:getBenefitOfEvents(function(logic)
      for _, p in ipairs(ai.room:getOtherPlayers(player)) do
        local ret, _ = ai:askToChooseCards({
          cards = p:getCardIds("hej"),
          skill_name = guixin.name,
          data = {
            toArea = Card.PlayerHand,
            target = ai.player,
            reason = fk.ReasonPrey,
            proposer = ai.player,
          }
        })
        logic:obtainCard(ai.player, ret, false, fk.ReasonPrey, ai.player, guixin.name)
      end
      logic:setPlayerProperty(ai.player, "faceup", not ai.player.faceup)
    end) > 0
  end,
})

return guixin
