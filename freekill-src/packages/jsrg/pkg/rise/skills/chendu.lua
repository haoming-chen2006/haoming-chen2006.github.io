local chendu = fk.CreateSkill {
  name = "chendu",
  tags = { Skill.Compulsory },
}

Fk:loadTranslationTable{
  ["chendu"] = "陈笃",
  [":chendu"] = "锁定技，当你的牌因使用、打出或弃置进入弃牌堆后，若数量大于你的体力值（至多为2），你将这些牌分配给其他角色（若不为你的回合，"..
  "则选择的角色必须包含当前回合角色）。",

  ["#chendu1-give"] = "陈笃：请将这些牌任意分配给其他角色",
  ["#chendu2-give"] = "陈笃：请将这些牌任意分配给其他角色，先选择至少一张分配给 %dest 的牌",
}

chendu:addEffect(fk.AfterCardsMove, {
  anim_type = "support",
  can_trigger = function(self, event, target, player, data)
    if player:hasSkill(chendu.name) then
      local cards = {}
      for _, move in ipairs(data) do
        if move.toArea == Card.DiscardPile then
          if move.from == player and move.moveReason == fk.ReasonDiscard then
            for _, info in ipairs(move.moveInfo) do
              if info.fromArea == Card.PlayerHand or info.fromArea == Card.PlayerEquip then
                table.insertIfNeed(cards, info.cardId)
              end
            end
          elseif move.from == nil and
            table.contains({fk.ReasonUse, fk.ReasonResponse}, move.moveReason) then
            local parent_event = player.room.logic:getCurrentEvent().parent
            if parent_event ~= nil then
              local card_ids = {}
              if parent_event.event == GameEvent.UseCard or parent_event.event == GameEvent.RespondCard then
                local use = parent_event.data
                if use.from == player then
                  parent_event:searchEvents(GameEvent.MoveCards, 1, function(e2)
                    if e2.parent and e2.parent.id == parent_event.id then
                      for _, move2 in ipairs(e2.data) do
                        if (move2.moveReason == fk.ReasonUse or move2.moveReason == fk.ReasonResponse) then
                          for _, info in ipairs(move2.moveInfo) do
                            if info.fromArea == Card.PlayerHand or info.fromArea == Card.PlayerEquip then
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
                  if table.contains(card_ids, info.cardId) and info.fromArea == Card.Processing then
                    table.insertIfNeed(cards, info.cardId)
                  end
                end
              end
            end
          end
        end
      end
      cards = table.filter(cards, function (id)
        return table.contains(player.room.discard_pile, id)
      end)
      cards = player.room.logic:moveCardsHoldingAreaCheck(cards)
      if #cards > math.min(player.hp, 2) and #cards > 0 and #player.room:getOtherPlayers(player, false) > 0 then
        event:setCostData(self, {cards = cards})
        return true
      end
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local all_cards = table.simpleClone(event:getCostData(self).cards)
    local to = room.current
    if to == player or to.dead then
      room:askToYiji(player, {
        cards = all_cards,
        targets = room:getOtherPlayers(player, false),
        skill_name = chendu.name,
        min_num = #all_cards,
        max_num = #all_cards,
        prompt = "#chendu1-give",
        expand_pile = all_cards,
      })
    else
      local cards = table.simpleClone(all_cards)
      local ids = room:askToCards(player, {
        min_num = 1,
        max_num = #cards,
        include_equip = false,
        skill_name = chendu.name,
        cancelable = false,
        pattern = tostring(Exppattern{ id = all_cards }),
        prompt = "#chendu2-give::" .. to.id,
        expand_pile = all_cards,
      })
      for _, id in ipairs(ids) do
        table.removeOne(cards, id)
        room:setCardMark(Fk:getCardById(id), "@DistributionTo", Fk:translate(to.general))
      end
      if #cards == 0 then
        for _, id in ipairs(ids) do
          room:setCardMark(Fk:getCardById(id), "@DistributionTo", 0)
        end
        room:moveCardTo(ids, Card.PlayerHand, to, fk.ReasonGive, chendu.name, nil, true, player)
      else
        local list = room:askToYiji(player, {
          cards = cards,
          targets = room:getOtherPlayers(player, false),
          skill_name = chendu.name,
          min_num = #cards,
          max_num = #cards,
          prompt = "#chendu1-give",
          expand_pile = cards,
          skip = true,
        })
        for _, id in ipairs(ids) do
          table.insert(list[to.id], id)
        end
        for _, id in ipairs(all_cards) do
          room:setCardMark(Fk:getCardById(id), "@DistributionTo", 0)
        end
        room:doYiji(list, player, chendu.name)
      end
    end
  end,
})

return chendu
