local ninghan = fk.CreateSkill {
  name = "ninghan",
  tags = { Skill.Compulsory },
}

Fk:loadTranslationTable{
  ["ninghan"] = "凝寒",
  [":ninghan"] = "锁定技，所有角色手牌中的♣【杀】均视为冰【杀】；当一名角色受到冰冻伤害后，你可以将造成此伤害的牌置于武将牌上。",

  ["#ninghan-invoke"] = "凝寒：是否将%arg置于武将牌上？",
}

ninghan:addEffect("filter", {
  card_filter = function(self, card, player)
    return table.find(Fk:currentRoom().alive_players, function (p)
        return p:hasSkill(ninghan.name)
      end) and
      card.suit == Card.Club and card.trueName == "slash" and
      table.contains(player:getCardIds("h"), card.id)
  end,
  view_as = function(self, player, to_select)
    return Fk:cloneCard("ice__slash", Card.Club, to_select.number)
  end,
})

ninghan:addEffect(fk.Damaged, {
  anim_type = "masochism",
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(ninghan.name) and player:hasSkill("shacheng", true) and
      data.damageType == fk.IceDamage and data.card and
      player.room:getCardArea(data.card) == Card.Processing
  end,
  on_cost = function(self, event, target, player, data)
    return player.room:askToSkillInvoke(player, {
      skill_name = "ninghan",
      prompt = "#ninghan-invoke:::" .. data.card:toLogString(),
    })
  end,
  on_use = function(self, event, target, player, data)
    player:addToPile("shacheng", data.card, true, ninghan.name, player)
  end,
})

return ninghan
