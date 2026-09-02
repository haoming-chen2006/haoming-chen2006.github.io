local yinbing = fk.CreateSkill {
  name = "yinbing",
  derived_piles = "$yinbing",
}

Fk:loadTranslationTable{
  ["yinbing"] = "引兵",
  [":yinbing"] = "结束阶段，你可以将任意张非基本牌置于你的武将牌上。当你受到【杀】或【决斗】造成的伤害后，你移去你武将牌上的一张牌。",

  ["$yinbing"] = "引兵",
  ["#yinbing-ask"] = "引兵：你可以将任意张非基本牌置于你的武将牌上",
  ["#yingbing-remove"] = "引兵：你需移去一张“引兵”牌",

  ["$yinbing1"] = "追兵凶猛，末将断后！",
  ["$yinbing2"] = "将军走此小道，追兵交我应付！"
}

yinbing:addEffect(fk.EventPhaseStart, {
  anim_type = "support",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(yinbing.name) and player.phase == Player.Finish and
      not player:isNude()
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local cards = room:askToCards(player, {
      skill_name = yinbing.name,
      min_num = 1,
      max_num = 999,
      include_equip = true,
      pattern = ".|.|.|.|.|^basic",
      prompt = "#yinbing-ask",
      cancelable = true,
    })
    if #cards > 0 then
      event:setCostData(self, {cards = cards})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    player:addToPile("$yinbing", event:getCostData(self).cards, false, yinbing.name)
  end,
})

yinbing:addEffect(fk.Damaged, {
  anim_type = "negative",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(yinbing.name) and #player:getPile("$yinbing") > 0 and
      data.card and (data.card.trueName == "slash" or data.card.name == "duel")
  end,
  on_cost = Util.TrueFunc,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local cards = player:getPile("$yinbing")
    if #cards > 1 then
      cards = room:askToCards(player, {
        skill_name = yinbing.name,
        min_num = 1,
        max_num = 1,
        include_equip = false,
        pattern = ".|.|.|$yinbing",
        prompt = "#yingbing-remove",
        expand_pile = "$yinbing",
        cancelable = false,
      })
    end
    room:moveCardTo(cards, Card.DiscardPile, nil, fk.ReasonPutIntoDiscardPile, yinbing.name, nil, true, player)
  end,
})

return yinbing
