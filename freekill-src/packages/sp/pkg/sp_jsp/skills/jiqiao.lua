
local jiqiao = fk.CreateSkill {
  name = "jiqiao",
}

Fk:loadTranslationTable{
  ["jiqiao"] = "机巧",
  [":jiqiao"] = "出牌阶段开始时，你可以弃置任意张装备牌，然后亮出牌堆顶两倍数量的牌，你获得其中的锦囊牌，将其余的牌置入弃牌堆。",

  ["#jiqiao-invoke"] = "机巧：你可以弃置任意张装备牌，亮出牌堆顶两倍的牌，获得其中的锦囊牌",

  ["$jiqiao1"] = "驭巧器，以取先机。",
  ["$jiqiao2"] = "颖悟之人，不以拙力取胜。",
}

jiqiao:addEffect(fk.EventPhaseStart, {
  anim_type = "drawcard",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(jiqiao.name) and player.phase == Player.Play and
      not player:isNude()
  end,
  on_cost = function (self, event, target, player, data)
    local room = player.room
    local cards = room:askToDiscard(player, {
      min_num = 1,
      max_num = 999,
      include_equip = true,
      skill_name = jiqiao.name,
      pattern = ".|.|.|.|.|equip",
      prompt = "#jiqiao-invoke",
      cancelable = true,
      skip = true,
    })
    if #cards > 0 then
      event:setCostData(self, {cards = cards})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    room:throwCard(event:getCostData(self).cards, jiqiao.name, player, player)
    if player.dead then return end
    local cards = room:getNCards(2 * #event:getCostData(self).cards)
    room:turnOverCardsFromDrawPile(player, cards, jiqiao.name)
    room:delay(1000)
    local ids = table.filter(cards, function (id)
      return Fk:getCardById(id).type == Card.TypeTrick
    end)
    if #ids > 0 then
      room:moveCardTo(ids, Card.PlayerHand, player, fk.ReasonJustMove, jiqiao.name, nil, true, player)
    end
    room:cleanProcessingArea(cards)
  end,
})

return jiqiao
