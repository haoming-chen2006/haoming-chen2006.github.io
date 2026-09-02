local liaoliao = fk.CreateSkill{
  name = "liaoliao",
}

Fk:loadTranslationTable{
  ["liaoliao"] = "了了",
  [":liaoliao"] = "其他角色的回合开始时，你可以弃置一张牌，本回合你不能成为点数大于此牌的牌的目标。",

  ["#liaoliao-discard"] = "你可弃置一张牌发动“了了”，本回合你不能成为点数大于此牌的牌的目标",
  ["@liaoliao-turn"] = "了了",
}

liaoliao:addEffect(fk.TurnStart, {
  can_trigger = function(self, event, target, player, data)
    return target ~= player and player:hasSkill(self.name) and not player:isNude()
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local cards = room:askToDiscard(player, {
      skill_name = liaoliao.name,
      min_num = 1,
      max_num = 1,
      include_equip = true,
      prompt = "#liaoliao-discard",
      skip = true,
      cancelable = true,
    })
    if #cards > 0 then
      event:setCostData(self, { cards = cards, tos = { target } })
      return true
    end
  end,
  on_use = function (self, event, target, player, data)
    local card = event:getCostData(self).cards[1]
    local room = player.room
    room:throwCard(card, liaoliao.name, player, player)
    if player.dead then return end
    local number = Fk:getCardById(card).number
    room:setPlayerMark(player, "@liaoliao-turn", number)
  end
})

liaoliao:addEffect("prohibit", {
  is_prohibited = function (self, from, to, card)
    if to:getMark("@liaoliao-turn") ~= 0 then
      return card and card.number > to:getMark("@liaoliao-turn")
    end
  end
})

return liaoliao
