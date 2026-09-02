local pianchong = fk.CreateSkill {
  name = "js__pianchong",
}

Fk:loadTranslationTable{
  ["js__pianchong"] = "偏宠",
  [":js__pianchong"] = "一名角色的结束阶段，若你于此回合内失去过牌，你可以判定，摸X张牌（X为此回合进入过弃牌堆的与判定结果颜色相同的牌数）。",

  ["$js__pianchong1"] = "承君恩露于椒房，得君恩宠于万世。",
  ["$js__pianchong2"] = "后宫有佳丽三千，然陛下独宠我一人。",
}

pianchong:addEffect(fk.EventPhaseStart, {
  anim_type = "drawcard",
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(pianchong.name) and target.phase == Player.Finish and
      #player.room.logic:getEventsOfScope(GameEvent.MoveCards, 1, function (e)
        for _, move in ipairs(e.data) do
          if move.from == player then
            for _, info in ipairs(move.moveInfo) do
              if info.fromArea == Card.PlayerHand or info.fromArea == Card.PlayerEquip then
                return true
              end
            end
          end
        end
      end, Player.HistoryTurn) > 0
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local judge = {
      who = player,
      reason = pianchong.name,
      pattern = ".|.|^nosuit",
    }
    room:judge(judge)
    local color = judge.card.color
    if player.dead or color == Card.NoColor then return end
    local cards = {}
    room.logic:getEventsOfScope(GameEvent.MoveCards, 1, function (e)
      for _, move in ipairs(e.data) do
        if move.toArea == Card.DiscardPile then
          for _, info in ipairs(move.moveInfo) do
            if room:getCardArea(info.cardId) == Card.DiscardPile and Fk:getCardById(info.cardId).color == color then
              table.insertIfNeed(cards, info.cardId)
            end
          end
        end
      end
    end, Player.HistoryTurn)
    if #cards > 0 then
      player:drawCards(#cards, pianchong.name)
    end
  end,
})

return pianchong
