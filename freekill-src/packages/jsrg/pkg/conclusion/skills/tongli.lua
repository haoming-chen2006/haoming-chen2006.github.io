local tongli = fk.CreateSkill {
  name = "js__tongli",
}

Fk:loadTranslationTable{
  ["js__tongli"] = "同礼",
  [":js__tongli"] = "当你于出牌阶段内使用基本牌或普通锦囊牌指定第一个目标后，若你手牌中的花色数等于你此阶段已使用牌数，你可以展示手牌，"..
  "令此牌效果额外结算一次。",

  ["@js__tongli-phase"] = "同礼",

  ["$js__tongli1"] = "君或以妾替胞妹之所在，故以旧礼待我新人。",
  ["$js__tongli2"] = "昔日妾曾羡姊妹之仪，今日君待我礼同姊妹。",
}

tongli:addEffect(fk.TargetSpecified, {
  anim_type = "offensive",
  can_trigger = function(self, event, target, player, data)
    if target == player and player:hasSkill(tongli.name) and player.phase == Player.Play and
      (data.card.type == Card.TypeBasic or data.card:isCommonTrick()) and
      data.firstTarget and not player:isKongcheng() then
      local suits = {}
      for _, id in ipairs(player:getCardIds("h")) do
        table.insertIfNeed(suits, Fk:getCardById(id).suit)
      end
      table.removeOne(suits, Card.NoSuit)
      return #suits == #player.room.logic:getEventsByRule(GameEvent.UseCard, 5, function (e)
        if e.id <= player.room.logic:getCurrentEvent().id then
          return e.data.from == player
        end
      end, nil, Player.HistoryPhase)
    end
  end,
  on_use = function(self, event, target, player, data)
    player:showCards(player:getCardIds("h"))
    data.use.additionalEffect = (data.use.additionalEffect or 0) + 1
  end,
})

tongli:addEffect(fk.PreCardUse, {
  can_refresh = function(self, event, target, player, data)
    return target == player and player:hasSkill(tongli.name, true) and player.phase == Player.Play
  end,
  on_refresh = function(self, event, target, player, data)
    player.room:addPlayerMark(player, "@js__tongli-phase", 1)
  end,
})

tongli:addAcquireEffect(function (self, player, is_start)
  if player.phase == Player.Play then
    local room = player.room
    local n = #room.logic:getEventsOfScope(GameEvent.UseCard, 999, function (e)
      return e.data.from == player
    end, Player.HistoryPhase)
    room:setPlayerMark(player, "@js__tongli-phase", n)
  end
end)

tongli:addLoseEffect(function (self, player, is_death)
  player.room:setPlayerMark(player, "@js__tongli-phase", 0)
end)

return tongli
