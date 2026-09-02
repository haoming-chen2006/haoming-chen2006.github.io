local manjuan = fk.CreateSkill {
  name = "js__manjuan",
}

Fk:loadTranslationTable{
  ["js__manjuan"] = "漫卷",
  [":js__manjuan"] = "若你没有手牌，你可以如手牌般使用或打出本回合进入弃牌堆的牌（每种点数每回合限一次）。",

  ["#js__manjuan"] = "漫卷：你可以使用或打出本回合进入弃牌堆的牌，每种点数每回合限一次",
}

manjuan:addEffect("viewas", {
  pattern = ".",
  prompt = "#js__manjuan",
  expand_pile = function(self, player)
    return player:getTableMark("js__manjuan-turn")
  end,
  card_filter = function(self, player, to_select, selected)
    if #selected == 0 and table.contains(player:getTableMark("js__manjuan-turn"), to_select) and
      not table.contains(player:getTableMark("js__manjuan_used-turn"), Fk:getCardById(to_select).number) then
      local card = Fk:getCardById(to_select)
      if Fk.currentResponsePattern == nil then
        return player:canUse(card) and not player:prohibitUse(card)
      else
        return Exppattern:Parse(Fk.currentResponsePattern):match(card)
      end
    end
  end,
  view_as = function(self, player, cards)
    if #cards ~= 1 then return end
    return Fk:getCardById(cards[1])
  end,
  before_use = function (self, player, use)
    player.room:addTableMark(player, "js__manjuan_used-turn", use.card.number)
  end,

  enabled_at_play = function(self, player)
    return player:isKongcheng()
  end,
  enabled_at_response = function(self, player, response)
    return player:isKongcheng()
  end,
})

manjuan:addEffect(fk.AfterCardsMove, {
  can_refresh = function(self, event, target, player, data)
    if player:hasSkill(manjuan.name, true) then
      for _, move in ipairs(data) do
        if move.toArea == Card.DiscardPile then
          for _, info in ipairs(move.moveInfo) do
            if table.contains(player.room.discard_pile, info.cardId) then
              return true
            end
          end
        end
        for _, info in ipairs(move.moveInfo) do
          if info.fromArea == Card.DiscardPile and not table.contains(player.room.discard_pile, info.cardId) then
            return true
          end
        end
      end
    end
  end,
  on_refresh = function(self, event, target, player, data)
    local room = player.room
    local ids = player:getTableMark("js__manjuan-turn")
    for _, move in ipairs(data) do
      if move.toArea == Card.DiscardPile then
        for _, info in ipairs(move.moveInfo) do
          if table.contains(room.discard_pile, info.cardId) then
            table.insertIfNeed(ids, info.cardId)
          end
        end
      end
      for _, info in ipairs(move.moveInfo) do
        if info.fromArea == Card.DiscardPile and not table.contains(room.discard_pile, info.cardId) then
          table.removeOne(ids, info.cardId)
        end
      end
    end
    room:setPlayerMark(player, "js__manjuan-turn", ids)
  end,
})

manjuan:addAcquireEffect(function (self, player, is_start)
  local room = player.room
  local ids = {}
  room.logic:getEventsOfScope(GameEvent.MoveCards, 1, function(e)
    for _, move in ipairs(e.data) do
      if move.toArea == Card.DiscardPile then
        for _, info in ipairs(move.moveInfo) do
          if table.contains(room.discard_pile, info.cardId) then
            table.insertIfNeed(ids, info.cardId)
          end
        end
      end
    end
  end, Player.HistoryTurn)
  room:setPlayerMark(player, "js__manjuan-turn", ids)
end)

return manjuan
