local luoying = fk.CreateSkill {
  name = "luoying",
}

Fk:loadTranslationTable{
  ["luoying"] = "落英",
  [":luoying"] = "当其他角色的♣牌因弃置或判定进入弃牌堆后，你可以获得之。",

  ["#luoying-choose"] = "落英：选择要获得的牌",
  ["get_all"] = "全部获得",
  ["@@luoying-inhand"] = "落英",

  ["$luoying1"] = "这些都是我的。",
  ["$luoying2"] = "别着急扔，给我就好。",
}

luoying:addEffect(fk.AfterCardsMove, {
  anim_type = "drawcard",
  can_trigger = function(self, event, target, player, data)
    if player:hasSkill(luoying.name) then
      local ids = {}
      for _, move in ipairs(data) do
        if move.toArea == Card.DiscardPile then
          if move.moveReason == fk.ReasonDiscard and move.from and move.from ~= player then
            for _, info in ipairs(move.moveInfo) do
              if (info.fromArea == Card.PlayerHand or info.fromArea == Card.PlayerEquip) and
                Fk:getCardById(info.cardId).suit == Card.Club then
                table.insertIfNeed(ids, info.cardId)
              end
            end
          elseif move.moveReason == fk.ReasonJudge then
            local judge_event = player.room.logic:getCurrentEvent():findParent(GameEvent.Judge)
            if judge_event and judge_event.data.who ~= player then
              for _, info in ipairs(move.moveInfo) do
                if info.fromArea == Card.Processing and Fk:getCardById(info.cardId).suit == Card.Club then
                  table.insertIfNeed(ids, info.cardId)
                end
              end
            end
          end
        end
      end
      ids = table.filter(ids, function (id)
        return table.contains(player.room.discard_pile, id)
      end)
      ids = player.room.logic:moveCardsHoldingAreaCheck(ids)
      if #ids > 0 then
        event:setCostData(self, {cards = ids})
        return true
      end
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local ids = table.simpleClone(event:getCostData(self).cards)
    if #ids > 1 then
      local cards, _ = room:askToChooseCardsAndChoice(player, {
        cards = ids,
        min_num = 1,
        max_num = #ids,
        skill_name = luoying.name,
        prompt = "#luoying-choose",
        cancel_choices = {"get_all"}
      })
      if #cards > 0 then
        ids = cards
      end
    end
    room:moveCardTo(ids, Card.PlayerHand, player, fk.ReasonJustMove, luoying.name, nil, true, player, "@@luoying-inhand")
  end,
})

return luoying