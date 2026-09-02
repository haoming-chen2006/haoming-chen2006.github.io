local dingpin = fk.CreateSkill {
  name = "dingpin",
}

Fk:loadTranslationTable{
  ["dingpin"] = "定品",
  [":dingpin"] = "出牌阶段，你可以弃置一张与你本回合已使用或弃置的牌类别均不同的手牌，然后令一名已受伤的角色进行一次判定，若结果为黑色，"..
  "该角色摸X张牌（X为该角色已损失的体力值），然后你本回合不能再对其发动〖定品〗；若结果为红色，将你的武将牌翻面。",

  ["#dingpin"] = "定品：弃一张牌，令一名角色判定，若为黑色其摸已损失体力值的牌，若为红色你翻面",

  ["$dingpin1"] = "取才赋职，论能行赏。",
  ["$dingpin2"] = "定品寻良骥，中正探人杰。",
}

dingpin:addAcquireEffect(function (self, player, is_start)
  if not is_start and player.room.current == player then
    local room = player.room
    local types = {}
    room.logic:getEventsOfScope(GameEvent.MoveCards, 1, function(e)
      for _, move in ipairs(e.data) do
        if move.from == player and move.moveReason == fk.ReasonDiscard then
          for _, info in ipairs(move.moveInfo) do
            table.insertIfNeed(types, Fk:getCardById(info.cardId).type)
          end
        end
      end
    end, Player.HistoryTurn)
    room.logic:getEventsOfScope(GameEvent.UseCard, 1, function(e)
      local use = e.data
      if use.from == player then
        table.insertIfNeed(types, use.card.type)
      end
    end, Player.HistoryTurn)
    room:setPlayerMark(player, "dingpin-turn", types)
  end
end)

dingpin:addEffect("active", {
  anim_type = "support",
  prompt = "#dingpin",
  card_num = 1,
  target_num = 1,
  card_filter = function(self, player, to_select, selected)
    return #selected == 0 and table.contains(player:getCardIds("h"), to_select) and
      not player:prohibitDiscard(to_select) and
      not table.contains(player:getTableMark("dingpin-turn"), Fk:getCardById(to_select).type)
  end,
  target_filter = function(self, player, to_select, selected)
    return #selected == 0 and to_select:isWounded() and
      not table.contains(player:getTableMark("dingpin_target-turn"), to_select.id)
  end,
  on_use = function(self, room, effect)
    local player = effect.from
    local target = effect.tos[1]
    room:throwCard(effect.cards, dingpin.name, player, player)
    if target.dead then return end
    local judge = {
      who = target,
      reason = dingpin.name,
      pattern = ".|.|spade,club",
    }
    room:judge(judge)
    if judge:matchPattern() then
      if not player.dead then
        room:addTableMark(player, "dingpin_target-turn", target.id)
      end
      if target:isWounded() and not target.dead then
        target:drawCards(target:getLostHp(), dingpin.name)
      end
    elseif judge.card.color == Card.Red and not player.dead then
      player:turnOver()
    end
  end,
})

dingpin:addEffect(fk.AfterCardUseDeclared, {
  can_refresh = function(self, event, target, player, data)
    return target == player and player:hasSkill(dingpin.name, true) and player.room.current == player
  end,
  on_refresh = function(self, event, target, player, data)
    player.room:addTableMarkIfNeed(player, "dingpin-turn", data.card.type)
  end,
})

dingpin:addEffect(fk.AfterCardsMove, {
  can_refresh = function(self, event, target, player, data)
    if player:hasSkill(dingpin.name, true) and player.room.current == player and #player:getTableMark("dingpin-turn") < 3 then
      for _, move in ipairs(data) do
        if move.from == player and move.moveReason == fk.ReasonDiscard then
          return true
        end
      end
    end
  end,
  on_refresh = function(self, event, target, player, data)
    local room = player.room
    local types = player:getTableMark("dingpin-turn")
    for _, move in ipairs(data) do
      if move.from == player and move.moveReason == fk.ReasonDiscard then
        for _, info in ipairs(move.moveInfo) do
          table.insertIfNeed(types, Fk:getCardById(info.cardId).type)
        end
      end
    end
    room:setPlayerMark(player, "dingpin-turn", types)
  end,
})

return dingpin
