local zhubei = fk.CreateSkill {
  name = "js__zhubei",
  tags = { Skill.Compulsory },
}

Fk:loadTranslationTable{
  ["js__zhubei"] = "逐北",
  [":js__zhubei"] = "锁定技，你对本回合受到过伤害/失去过最后手牌的角色造成的伤害+1/使用牌无次数限制。",
}

zhubei:addEffect(fk.DamageCaused, {
  anim_type = "offensive",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(zhubei.name) and
      #player.room.logic:getActualDamageEvents(1, function(e)
        return e.data.to == data.to
      end, Player.HistoryTurn) > 0
  end,
  on_use = function(self, event, target, player, data)
    data:changeDamage(1)
  end,
})

zhubei:addEffect(fk.AfterCardsMove, {
  can_refresh = function (self, event, target, player, data)
    if player:getMark("js__zhubei_lost_lost-turn") == 0 and player:isKongcheng() then
      for _, move in ipairs(data) do
        if move.from == player then
          for _, info in ipairs(move.moveInfo) do
            if info.fromArea == Card.PlayerHand then
              return true
            end
          end
        end
      end
    end
  end,
  on_refresh = function (self, event, target, player, data)
    player.room:setPlayerMark(player, "js__zhubei_lost-turn", 1)
  end,
})

zhubei:addEffect("targetmod", {
  bypass_times = function (self, player, skill, scope, card, to)
    return card and player:hasSkill(zhubei.name) and to and to:getMark("js__zhubei_lost-turn") > 0
  end,
})

zhubei:addAcquireEffect(function (self, player, is_start)
  if not is_start then
    local room = player.room
    room.logic:getEventsByRule(GameEvent.MoveCards, 1, function (e)
      for i = #e.data, 1, -1 do
        local move = e.data[i]
        if move.from then
          for _, info in ipairs(move.moveInfo) do
            if info.fromArea == Card.PlayerHand then
              if not move.from.dead then
                room:setPlayerMark(player, "js__zhubei_lost-turn", 1)
              end
              return true
            end
          end
        end
      end
    end, nil, Player.HistoryTurn)
  end
end)

return zhubei
