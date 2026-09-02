local lirang = fk.CreateSkill {
  name = "re__lirang",
}

Fk:loadTranslationTable{
  ["re__lirang"] = "礼让",
  [":re__lirang"] = "每轮开始时，你可以选择至多两名其他角色，你亮出牌堆顶四张牌，这些角色依次可以获得其中任意张牌，你获得剩余的牌。",

  ["#re__lirang-choose"] = "礼让：选择至多两名角色，亮出牌堆顶四张牌，你和这些角色获得这些牌",
  ["#re__lirang-prey"] = "礼让：获得其中任意张牌",
}

lirang:addEffect(fk.RoundStart, {
  anim_type = "support",
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(lirang.name) and #player.room:getOtherPlayers(player, false) > 0
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local tos = room:askToChoosePlayers(player, {
      targets = room:getOtherPlayers(player, false),
      min_num = 1,
      max_num = 2,
      prompt = "#re__lirang-choose",
      skill_name = lirang.name,
      cancelable = true,
    })
    if #tos > 0 then
      room:sortByAction(tos)
      event:setCostData(self, {tos = tos})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local tos = table.simpleClone(event:getCostData(self).tos)
    local num = {}
    local cards = room:getNCards(4)
    room:turnOverCardsFromDrawPile(player, cards, lirang.name)
    for _, p in ipairs(tos) do
      if #cards > 0 then
        local ids = room:askToChooseCards(p, {
          target = p,
          min = 0,
          max = #cards,
          flag = { card_data = {{ lirang.name, cards }} },
          skill_name = lirang.name,
          prompt = "#re__lirang-prey",
        })
        if #ids > 0 then
          for i = #cards, 1, -1 do
            if table.contains(ids, cards[i]) then
              table.remove(cards, i)
            end
          end
          room:moveCardTo(ids, Card.PlayerHand, p, fk.ReasonJustMove, lirang.name, nil, true, p)
        end
        table.insert(num, #ids)
      else
        table.insert(num, 0)
      end
    end
    if player.dead then
      room:cleanProcessingArea(cards)
    else
      table.insert(num, #cards)
      if #cards > 0 then
        room:moveCardTo(cards, Card.PlayerHand, player, fk.ReasonJustMove, lirang.name, nil, true, player)
        if player.dead then return end
      end
      local max, min = num[1], num[1]
      table.insert(tos, player)
      for i = 2, #tos do
        if max < num[i] then
          max = num[i]
        elseif max == num[i] then
          return
        end
        if min > num[i] then
          min = num[i]
        elseif min == num[i] then
          return
        end
      end
      max, min = tos[table.indexOf(num, max)], tos[table.indexOf(num, min)]
      if max.dead or min.dead then return end
      room:setPlayerMark(player, "re__lirang-round", {max.id, min.id})
    end
  end,
})

return lirang
