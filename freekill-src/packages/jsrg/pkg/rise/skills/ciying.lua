local ciying = fk.CreateSkill {
  name = "ciying",
}

Fk:loadTranslationTable{
  ["ciying"] = "辞应",
  [":ciying"] = "每回合限一次，你可以将至少X张牌当任意基本牌使用或打出（X为本回合未进入过弃牌堆的花色数，至少为1）。此牌结算结束后，"..
  "若本回合所有花色的牌均进入过弃牌堆，你将手牌摸至体力上限。",

  ["#ciying"] = "辞应：你可以将至少%arg张牌当任意基本牌使用或打出",
  ["@[suits]ciying-turn"] = "辞应",
}

ciying:addEffect("viewas", {
  pattern = ".|.|.|.|.|basic",
  prompt = function (self, player, selected_cards)
    return "#ciying:::"..math.max(4 - #player:getTableMark("@[suits]ciying-turn"), 1)
  end,
  interaction = function(self, player)
    local all_names = Fk:getAllCardNames("b")
    local names = player:getViewAsCardNames(ciying.name, all_names)
    if #names > 0 then
      return UI.CardNameBox { choices = names, all_choices = all_names }
    end
  end,
  handly_pile = true,
  card_filter = Util.TrueFunc,
  view_as = function(self, player, cards)
    if #cards == 0 or #cards < (4 - #player:getTableMark("@[suits]ciying-turn")) or not self.interaction.data then return end
    local card = Fk:cloneCard(self.interaction.data)
    card:addSubcards(cards)
    card.skillName = ciying.name
    return card
  end,
  after_use = function (self, player, use)
    if not player.dead and player:getHandcardNum() < player.maxHp then
      local suits = {}
      player.room.logic:getEventsOfScope(GameEvent.MoveCards, 1, function (e)
        for _, move in ipairs(e.data) do
          if move.toArea == Card.DiscardPile then
            for _, info in ipairs(move.moveInfo) do
              table.insertIfNeed(suits, Fk:getCardById(info.cardId).suit)
            end
          end
        end
      end, Player.HistoryTurn)
      table.removeOne(suits, Card.NoSuit)
      if #suits == 4 then
        player:drawCards(player.maxHp - player:getHandcardNum(), ciying.name)
      end
    end
  end,
  enabled_at_play = function (self, player)
    return player:usedSkillTimes(ciying.name, Player.HistoryTurn) == 0
  end,
  enabled_at_response = function (self, player, response)
    return player:usedSkillTimes(ciying.name, Player.HistoryTurn) == 0
  end,
})

ciying:addEffect(fk.AfterCardsMove, {
  can_refresh = function(self, event, target, player, data)
    if player:hasSkill(ciying.name, true) and #player:getTableMark("@[suits]ciying-turn") < 4 then
      for _, move in ipairs(data) do
        if move.toArea == Card.DiscardPile then
          return true
        end
      end
    end
  end,
  on_refresh = function(self, event, target, player, data)
    local mark = player:getTableMark("@[suits]ciying-turn")
    for _, move in ipairs(data) do
      if move.toArea == Card.DiscardPile then
        for _, info in ipairs(move.moveInfo) do
          table.insertIfNeed(mark, Fk:getCardById(info.cardId).suit)
        end
      end
    end
    table.removeOne(mark, Card.NoSuit)
    player.room:setPlayerMark(player, "@[suits]ciying-turn", mark)
  end,
})

ciying:addAcquireEffect(function (self, player, is_start)
  if not is_start then
    local room = player.room
    local suits = {}
    room.logic:getEventsOfScope(GameEvent.MoveCards, 1, function (e)
      for _, move in ipairs(e.data) do
        if move.toArea == Card.DiscardPile then
          for _, info in ipairs(move.moveInfo) do
            table.insertIfNeed(suits, Fk:getCardById(info.cardId).suit)
          end
        end
      end
    end, Player.HistoryTurn)
    table.removeOne(suits, Card.NoSuit)
    if #suits > 0 then
      room:setPlayerMark(player, "@[suits]ciying-turn", suits)
    end
  end
end)

ciying:addLoseEffect(function (self, player, is_death)
  player.room:setPlayerMark(player, "@[suits]ciying-turn", 0)
end)

return ciying
