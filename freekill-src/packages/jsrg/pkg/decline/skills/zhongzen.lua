local zhongzen = fk.CreateSkill {
  name = "zhongzen",
  tags = { Skill.Compulsory },
}

Fk:loadTranslationTable{
  ["zhongzen"] = "众谮",
  [":zhongzen"] = "锁定技，弃牌阶段开始时，你令所有手牌数小于你的角色各交给你一张手牌。若如此做，此阶段结束时，若你本阶段弃置的♠牌数"..
  "大于体力值，你弃置所有牌。",

  ["#zhongzhen"] = "众谮：请交给 %src 一张手牌",
}

zhongzen:addEffect(fk.EventPhaseStart, {
  anim_type = "control",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(zhongzen.name) and player.phase == Player.Discard and
      player:getHandcardNum() > 1 and
      table.find(player.room.alive_players, function(p)
        return p:getHandcardNum() < player:getHandcardNum() and not p:isKongcheng()
      end)
  end,
  on_cost = function (self, event, target, player, data)
    local targets = table.filter(player.room:getAlivePlayers(), function(p)
      return p:getHandcardNum() < player:getHandcardNum()
    end)
    event:setCostData(self, {tos = targets})
    return true
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    for _, p in ipairs(event:getCostData(self).tos) do
      if player.dead then return end
      if not p.dead and not p:isKongcheng() then
        local card = room:askToCards(p, {
          min_num = 1,
          max_num = 1,
          include_equip = false,
          prompt = "#zhongzhen:"..player.id,
          skill_name = zhongzen.name,
          cancelable = false,
        })
        room:obtainCard(player, card, false, fk.ReasonGive, p, zhongzen.name)
      end
    end
  end,
})

zhongzen:addEffect(fk.EventPhaseEnd, {
  anim_type = "negative",
  is_delay_effect = true,
  can_trigger = function(self, event, target, player, data)
    if target == player and player:usedSkillTimes(zhongzen.name, Player.HistoryPhase) > 0 and not player:isNude() then
      local n = 0
      player.room.logic:getEventsOfScope(GameEvent.MoveCards, 1, function (e)
        for _, move in ipairs(e.data) do
          if move.from == player then
            if move.moveReason == fk.ReasonDiscard then
              for _, info in ipairs(move.moveInfo) do
                if Fk:getCardById(info.cardId).suit == Card.Spade and
                  (info.fromArea == Card.PlayerHand or info.fromArea == Card.PlayerEquip) then
                  n = n + 1
                  if n > player.hp then
                    return true
                  end
                end
              end
            elseif move.moveReason == fk.ReasonJustMove and move.toArea == Card.Void then
              for _, info in ipairs(move.moveInfo) do
                if Fk:getCardById(info.cardId).suit == Card.Spade and
                  (info.fromArea == Card.PlayerHand or info.fromArea == Card.PlayerEquip) then
                  n = n + 1
                  if n > player.hp then
                    return true
                  end
                end
              end
            end
          end
        end
      end, Player.HistoryPhase)
      return n > player.hp
    end
  end,
  on_use = function(self, event, target, player, data)
    player:throwAllCards("he", zhongzen.name)
  end,
})

return zhongzen
