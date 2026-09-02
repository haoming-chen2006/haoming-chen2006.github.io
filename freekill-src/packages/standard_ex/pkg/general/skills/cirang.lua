local cirang = fk.CreateSkill{
  name = "cirang",
}

Fk:loadTranslationTable{
  ["cirang"] = "辞让",
  [":cirang"] = "每回合限一次，当你获得至少两张牌后，你可以展示这些牌并将其中任意张牌交给任意名角色，若你未保留其中点数最大的牌，你摸一张牌。",

  ["#cirang-invoke"] = "你可以发动“辞让”，展示你获得的牌并任意分配，若你未保留其中点数最大的牌，你摸一张牌",
  ["#cirang-give"] = "辞让：将这些牌交给任意名角色，若你未保留 %arg，你摸一张牌",
}

cirang:addEffect(fk.AfterCardsMove, {
  can_trigger = function (self, event, target, player, data)
    if not player:hasSkill(cirang.name) then return false end
    for _, move in ipairs(data) do
      if move.to == player and move.toArea == Player.Hand then
        if #move.moveInfo > 1 then
          return true
        end
      end
    end
  end,
  on_cost = function (self, event, target, player, data)
    local cards = {}
    for _, move in ipairs(data) do
      if #move.moveInfo > 1 and (move.to == player and move.toArea == Player.Hand) then
        for _, info in ipairs(move.moveInfo) do
          if table.contains(player:getCardIds("h"), info.cardId) then
            table.insertIfNeed(cards, info.cardId)
          end
        end
      end
    end
    if player.room:askToSkillInvoke(player, {
      skill_name = cirang.name,
      prompt = "#cirang-invoke",
    }) then
      event:setCostData(self, { cards = cards })
      return true
    end
  end,
  on_use = function (self, event, target, player, data)
    local cards = event:getCostData(self).cards ---@type integer[]
    player:showCards(cards)
    if player.dead then return end
    local room = player.room
    local max_cards = {}
    for _, cardId in ipairs(cards) do
      local card = Fk:getCardById(cardId)
      if #max_cards == 0 or card.number > Fk:getCardById(max_cards[1]).number then
        max_cards = { cardId }
      elseif card.number == Fk:getCardById(max_cards[1]).number then
        table.insert(max_cards, cardId)
      end
    end
    local result = room:askToYiji(player, {
      cards = cards,
      min_num = 0,
      max_num = #cards,
      prompt = "#cirang-give:::" .. table.concat(table.map(max_cards, function(id) return Fk:getCardById(id):toLogString() end), ", "),
      skill_name = cirang.name,
    })
    if player.dead then return end
    local draw = true
    local draw_determined = false
    for pid, cardIds in pairs(result) do
      if pid == player.id then
        for _, cardId in ipairs(cardIds) do
          if table.contains(max_cards, cardId) then
            draw = false
            break
          end
        end
      elseif not draw_determined then
        for _, cardId in ipairs(cardIds) do
          if table.removeOne(max_cards, cardId) and #max_cards == 0 then
            draw_determined = true
            break
          end
        end
      end
    end
    if not draw_determined and #max_cards > 0 then -- 不分配的默认给自己的不在result里
      draw = false
    end
    if draw then
      player:drawCards(1, cirang.name)
    end
  end
})

return cirang
