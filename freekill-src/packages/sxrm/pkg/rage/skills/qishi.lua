
local qishi = fk.CreateSkill {
  name = "qishiz",
  tags = { Skill.Contract },
}

Fk:loadTranslationTable{
  ["qishiz"] = "乞施",
  [":qishiz"] = "<a href='sxrm__contract'>契定技</a>，结束阶段，你可以获得本回合弃牌堆内其他角色置入的至多五张牌，然后跳过你下个摸牌阶段。",

  ["#qishiz-prey"] = "乞施：获得本回合弃牌堆内至多五张牌，跳过你下个摸牌阶段",
}

qishi:addEffect(fk.EventPhaseStart, {
  anim_type = "drawcard",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(qishi.name) and player.phase == Player.Finish and
      #player.room.logic:getEventsOfScope(GameEvent.MoveCards, 1, function (e)
        for _, move in ipairs(e.data) do
          if move.from and move.from ~= player and move.toArea == Card.DiscardPile then
            for _, info in ipairs(move.moveInfo) do
              if table.contains(player.room.discard_pile, info.cardId) then
                return true
              end
            end
          elseif move.from == nil then
            if move.moveReason == fk.ReasonUse or move.moveReason == fk.ReasonResponse then
              local use_event = player.room.logic:getCurrentEvent().parent
              if use_event ~= nil and (use_event.event == GameEvent.UseCard or use_event.event == GameEvent.RespondCard) then
                local use = use_event.data
                if use.from ~= player then
                  for _, info in ipairs(move.moveInfo) do
                    if table.contains(Card:getIdList(use.card), info.cardId) and
                      table.contains(player.room.discard_pile, info.cardId) then
                      return true
                    end
                  end
                end
              end
            elseif move.moveReason == fk.ReasonPindian then
              local pindian_event = player.room.logic:getCurrentEvent():findParent(GameEvent.Pindian)
              if pindian_event then
                local card_ids = {}
                pindian_event:searchEvents(GameEvent.MoveCards, 1, function(e2)
                  if e2.parent and e2.parent.id == pindian_event.id then
                    for _, move2 in ipairs(e2.data) do
                      if move2.from ~= player and move2.moveReason == fk.ReasonPindian and move2.toArea == Card.Processing then
                        for _, info in ipairs(move2.moveInfo) do
                          if info.fromArea == Card.PlayerHand or info.fromArea == Card.PlayerEquip then
                            table.insertIfNeed(card_ids, info.cardId)
                          end
                        end
                      end
                    end
                  end
                end)
                if #card_ids > 0 then
                  for _, info in ipairs(move.moveInfo) do
                    if info.fromArea == Card.Processing and
                      table.contains(player.room.discard_pile, info.cardId) and
                      table.contains(card_ids, info.cardId) then
                      return true
                    end
                  end
                end
              end
            end
          end
        end
      end, Player.HistoryTurn) > 0
  end,
  on_cost = function (self, event, target, player, data)
    return table.contains(player:getTableMark("contracted_skills"), qishi.name) or
      player.room:askToSkillInvoke(player, {
      skill_name = qishi.name,
      prompt = "#qishiz-prey",
    })
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    room:addTableMarkIfNeed(player, "contracted_skills", qishi.name)
    local ids = {}
    room.logic:getEventsOfScope(GameEvent.MoveCards, 1, function (e)
      for _, move in ipairs(e.data) do
        if move.from and move.from ~= player and move.toArea == Card.DiscardPile then
          for _, info in ipairs(move.moveInfo) do
            if table.contains(room.discard_pile, info.cardId) then
              table.insertIfNeed(ids, info.cardId)
            end
          end
        elseif move.from == nil then
          if move.moveReason == fk.ReasonUse or move.moveReason == fk.ReasonResponse then
            local use_event = player.room.logic:getCurrentEvent().parent
            if use_event ~= nil and (use_event.event == GameEvent.UseCard or use_event.event == GameEvent.RespondCard) then
              local use = use_event.data
              if use.from ~= player then
                for _, info in ipairs(move.moveInfo) do
                  if table.contains(Card:getIdList(use.card), info.cardId) and
                    table.contains(room.discard_pile, info.cardId) then
                    table.insertIfNeed(ids, info.cardId)
                  end
                end
              end
            end
          elseif move.moveReason == fk.ReasonPindian then
            local pindian_event = player.room.logic:getCurrentEvent():findParent(GameEvent.Pindian)
            if pindian_event then
              local card_ids = {}
              pindian_event:searchEvents(GameEvent.MoveCards, 1, function(e2)
                if e2.parent and e2.parent.id == pindian_event.id then
                  for _, move2 in ipairs(e2.data) do
                    if move2.from ~= player and move2.moveReason == fk.ReasonPindian and move2.toArea == Card.Processing then
                      for _, info in ipairs(move2.moveInfo) do
                        if info.fromArea == Card.PlayerHand or info.fromArea == Card.PlayerEquip then
                          table.insertIfNeed(card_ids, info.cardId)
                        end
                      end
                    end
                  end
                end
              end)
              if #card_ids > 0 then
                for _, info in ipairs(move.moveInfo) do
                  if info.fromArea == Card.Processing and
                    table.contains(room.discard_pile, info.cardId) and
                    table.contains(card_ids, info.cardId) then
                    table.insertIfNeed(ids, info.cardId)
                  end
                end
              end
            end
          end
        end
      end
    end, Player.HistoryTurn)
    local cards = room:askToChooseCards(player, {
      target = player,
      min = 1,
      max = 5,
      flag = { card_data = {{ "pile_discard", ids }} },
      skill_name = qishi.name,
      prompt = "#qishi-prey",
    })
    room:moveCardTo(cards, Card.PlayerHand, player, fk.ReasonJustMove, qishi.name, nil, false, player)
    if not player.dead then
      room:setPlayerMark(player, qishi.name, 1)
    end
  end,
})

qishi:addEffect(fk.EventPhaseChanging, {
  can_refresh = function(self, event, target, player, data)
    return target == player and data.phase == Player.Draw and
      player:getMark(qishi.name) > 0 and not data.skipped
  end,
  on_refresh = function(self, event, target, player, data)
    player.room:setPlayerMark(player, qishi.name, 0)
    data.skipped = true
  end,
})

return qishi
