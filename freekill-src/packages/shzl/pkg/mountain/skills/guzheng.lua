local guzheng = fk.CreateSkill {
  name = "guzheng",
}

Fk:loadTranslationTable{
  ["guzheng"] = "固政",
  [":guzheng"] = "其他角色的弃牌阶段结束时，你可以将此阶段中其弃置的一张手牌交给该角色，然后你可以获得其余此阶段内弃置的牌。",

  ["#guzheng-invoke"] = "固政：你可以令 %dest 获得其此次弃置的牌中的一张，然后你可获得剩余牌",
  ["#guzheng-title"] = "固政：选择一张牌还给 %dest",
  ["guzheng_yes"] = "确定，获得剩余牌",
  ["guzheng_no"] = "确定，不获得剩余牌",

  ["$guzheng1"] = "固国安邦，居当如是。",
  ["$guzheng2"] = "今当稳固内政，以御外患。",
}

guzheng:addEffect(fk.EventPhaseEnd, {
  anim_type = "support",
  can_trigger = function(self, event, target, player, data)
    if target ~= player and player:hasSkill(guzheng.name) and target.phase == Player.Discard and not target.dead then
      local room = player.room
      local guzheng_hand, guzheng_all, cards = {}, {}, {}
      room.logic:getEventsByRule(GameEvent.MoveCards, 1, function (e)
        for _, move in ipairs(e.data) do
          for _, info in ipairs(move.moveInfo) do
            local id = info.cardId
            if not table.contains(cards, id) then
              table.insert(cards, id)
              if move.toArea == Card.DiscardPile and move.moveReason == fk.ReasonDiscard and
                room:getCardArea(id) == Card.DiscardPile then
                table.insert(guzheng_all, id)
                if move.from == target and info.fromArea == Card.PlayerHand then
                  table.insert(guzheng_hand, id)
                end
              end
            end
          end
        end
        return false
      end, nil, Player.HistoryPhase)
      if #guzheng_hand > 0 then
        event:setCostData(self, { extra_data = { guzheng_hand, guzheng_all } })
        return true
      end
    end
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    if room:askToSkillInvoke(player, {
      skill_name = guzheng.name,
      prompt = "#guzheng-invoke::"..target.id,
    }) then
      event:setCostData(self, { tos = { target }, extra_data = event:getCostData(self).extra_data })
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local guzheng_hand, guzheng_all = event:getCostData(self).extra_data[1], event:getCostData(self).extra_data[2]
    guzheng_all = table.reverse(guzheng_all)
    local to_return = { guzheng_hand[1] }
    local choice = "guzheng_no"
    if #guzheng_all > 1 then
      to_return, choice = room:askToChooseCardsAndChoice(player, {
        cards = guzheng_hand,
        choices = { "guzheng_yes", "guzheng_no" },
        skill_name = guzheng.name,
        prompt = "#guzheng-title::" .. target.id,
        min_num = 1,
        max_num = 1,
        all_cards = guzheng_all
      })
    end
    local moveInfos = {}
    table.insert(moveInfos, {
      ids = to_return,
      to = target,
      toArea = Card.PlayerHand,
      moveReason = fk.ReasonGive,
      proposer = player,
      skillName = guzheng.name,
    })
    table.removeOne(guzheng_all, to_return[1])
    if choice == "guzheng_yes" and #guzheng_all > 0 then
      table.insert(moveInfos, {
        ids = guzheng_all,
        to = player,
        toArea = Card.PlayerHand,
        moveReason = fk.ReasonPrey,
        proposer = player,
        skillName = guzheng.name,
      })
    end
    room:moveCards(table.unpack(moveInfos))
  end,
})

guzheng:addAI(Fk.Ltk.AI.newInvokeStrategy{
  think = function(self, ai)
    local target = ai.room:getPlayerById(tonumber(string.split(ai.data[2], ":")[3]))
    if target:isFriend(ai.player) then
      return true
    else
      local room = ai.room
      local guzheng_hand, guzheng_all, cards = {}, {}, {}
      room.logic:getEventsByRule(GameEvent.MoveCards, 1, function (e)
        for _, move in ipairs(e.data) do
          for _, info in ipairs(move.moveInfo) do
            local id = info.cardId
            if not table.contains(cards, id) then
              table.insert(cards, id)
              if move.toArea == Card.DiscardPile and move.moveReason == fk.ReasonDiscard and
                room:getCardArea(id) == Card.DiscardPile then
                table.insert(guzheng_all, id)
                if move.from == target and info.fromArea == Card.PlayerHand then
                  table.insert(guzheng_hand, id)
                end
              end
            end
          end
        end
        return false
      end, nil, Player.HistoryPhase)
      local player = ai.player
      if #guzheng_all < 2 then
        return ai:getBenefitOfEvents(function(logic)
          logic:obtainCard(target, guzheng_hand, true, fk.ReasonGive, player, guzheng.name)
        end) >= 0
      else
        local ret, _ = ai:askToChooseCards({
          cards = guzheng_hand,
          skill_name = guzheng.name,
          data = {
            toArea = Card.PlayerHand,
            target = target,
            reason = fk.ReasonGive,
            proposer = player,
          },
        })
        table.removeOne(guzheng_all, ret[1])
        return ai:getBenefitOfEvents(function(logic)
          logic:obtainCard(target, ret, true, fk.ReasonGive, player, guzheng.name)
          logic:obtainCard(player, guzheng_all, true, fk.ReasonPrey, player, guzheng.name)
        end) >= 0
      end
    end
  end,
})

return guzheng
