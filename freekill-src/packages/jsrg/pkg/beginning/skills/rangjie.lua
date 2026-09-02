local rangjie = fk.CreateSkill {
  name = "js__rangjie",
}

Fk:loadTranslationTable{
  ["js__rangjie"] = "让节",
  [":js__rangjie"] = "当你受到1点伤害后，你可以移动场上一张牌，然后你可以获得一张花色相同的本回合进入弃牌堆的牌。",

  ["#js__rangjie-move"] = "让节：你可以移动场上一张牌，然后可以获得一张相同花色本回合进入弃牌堆的牌",
  ["#js__rangjie-prey"] = "让节：你可以获得一张本回合进入弃牌堆的%arg牌",

  ["$js__rangjie1"] = "公既受国之恩，自当遵主之命！",
  ["$js__rangjie2"] = "弼君以礼，公定晓此人臣之节！",
}

rangjie:addEffect(fk.Damaged, {
  anim_type = "masochism",
  trigger_times = function(self, event, target, player, data)
    return data.damage
  end,
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(rangjie.name) and #player.room:canMoveCardInBoard() > 0
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local targets = room:askToChooseToMoveCardInBoard(player, {
      skill_name = rangjie.name,
      prompt = "#js__rangjie-move",
      cancelable = true
    })
    if #targets > 0 then
      event:setCostData(self, {tos = targets})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local targets = event:getCostData(self).tos
    local result = room:askToMoveCardInBoard(player, {
      skill_name = rangjie.name,
      target_one = targets[1],
      target_two = targets[2],
    })
    if player.dead or result == nil then return end
    local suit = result.card:getSuitString(true)
    local cards = {}
    room.logic:getEventsOfScope(GameEvent.MoveCards, 1, function(e)
      for _, move in ipairs(e.data) do
        if move.toArea == Card.DiscardPile then
          for _, info in ipairs(move.moveInfo) do
            if table.contains(room.discard_pile, info.cardId) and
              Fk:getCardById(info.cardId):getSuitString(true) == suit then
              table.insertIfNeed(cards, info.cardId)
            end
          end
        end
      end
    end, Player.HistoryTurn)
    if #cards > 0 then
      local card = room:askToChooseCard(player, {
        target = player,
        flag = { card_data = {{ rangjie.name, cards }} },
        skill_name = rangjie.name,
        prompt = "#js__rangjie-prey:::"..suit,
      })
      room:moveCardTo(card, Card.PlayerHand, player, fk.ReasonJustMove, rangjie.name, nil, true, player)
    end
  end,
})

return rangjie
