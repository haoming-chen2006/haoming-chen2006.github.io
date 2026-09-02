local pianchong = fk.CreateSkill {
  name = "re__pianchong",
}

Fk:loadTranslationTable{
  ["re__pianchong"] = "偏宠",
  [":re__pianchong"] = "一名角色的结束阶段，若你于此回合内失去过牌，你可以判定，摸X张牌（X为你此回合进入过弃牌堆的与判定结果颜色相同的牌数）。",

  ["$re__pianchong1"] = "陛下垂青，鸾歌清扬。",
  ["$re__pianchong2"] = "君王恩宠，凤舞丝竹。",
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
    local n = 0
    room.logic:getEventsOfScope(GameEvent.MoveCards, 1, function (e)
      for _, move in ipairs(e.data) do
        if move.toArea == Card.DiscardPile then
          if move.from == player then
            for _, info in ipairs(move.moveInfo) do
              if (info.fromArea == Card.PlayerHand or info.fromArea == Card.PlayerEquip) and
                Fk:getCardById(info.cardId).color == color then
                n = n + 1
              end
            end
          elseif move.from == nil then
            if table.contains({fk.ReasonUse, fk.ReasonResponse}, move.moveReason) then
              local parent_event = e.parent
              if parent_event ~= nil then
                local card_ids = {}
                if parent_event.event == GameEvent.UseCard or parent_event.event == GameEvent.RespondCard then
                  local use = parent_event.data
                  if use.from == player then
                    parent_event:searchEvents(GameEvent.MoveCards, 1, function(e2)
                      if e2.parent and e2.parent.id == parent_event.id then
                        for _, move2 in ipairs(e2.data) do
                          if move2.from == player and (move2.moveReason == fk.ReasonUse or move2.moveReason == fk.ReasonResponse) then
                            for _, info in ipairs(move2.moveInfo) do
                              if (info.fromArea == Card.PlayerHand or info.fromArea == Card.PlayerEquip) then
                                table.insertIfNeed(card_ids, info.cardId)
                              end
                            end
                          end
                        end
                      end
                    end)
                  end
                end
                if #card_ids > 0 then
                  for _, info in ipairs(move.moveInfo) do
                    if table.contains(card_ids, info.cardId) and Fk:getCardById(info.cardId).color == color then
                      n = n + 1
                    end
                  end
                end
              end
            elseif move.moveReason == fk.ReasonPindian then
              local pindian_event = e:findParent(GameEvent.Pindian)
              if pindian_event then
                local card_ids = {}
                pindian_event:searchEvents(GameEvent.MoveCards, 1, function(e2)
                  if e2.parent and e2.parent.id == pindian_event.id then
                    for _, move2 in ipairs(e2.data) do
                      if move2.from == player and move2.moveReason == fk.ReasonPut and move2.toArea == Card.Processing then
                        for _, info in ipairs(move2.moveInfo) do
                          if (info.fromArea == Card.PlayerHand or info.fromArea == Card.PlayerEquip) then
                            table.insertIfNeed(card_ids, info.cardId)
                          end
                        end
                      end
                    end
                  end
                end)
                if #card_ids > 0 then
                  for _, info in ipairs(move.moveInfo) do
                    if table.contains(card_ids, info.cardId) and Fk:getCardById(info.cardId).color == color then
                      n = n + 1
                    end
                  end
                end
              end
            end
          end
        end
      end
    end, Player.HistoryTurn)
    if n > 0 then
      player:drawCards(n, pianchong.name)
    end
  end,
})

return pianchong
