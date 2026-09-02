local qingping = fk.CreateSkill {
  name = "qingping",
}

Fk:loadTranslationTable{
  ["qingping"] = "清平",
  [":qingping"] = "结束阶段开始时，若你攻击范围内的角色手牌数均大于0且不大于你，则你可以摸等同于这些角色数的牌。",
}

qingping:addEffect(fk.EventPhaseStart, {
  anim_type = "drawcard",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(qingping.name) and player.phase == Player.Finish and
      not table.find(player.room.alive_players, function(p)
        return player:inMyAttackRange(p) and (p:isKongcheng() or p:getHandcardNum() > player:getHandcardNum())
      end)
  end,
  on_use = function(self, event, target, player, data)
    local n = #table.filter(player.room.alive_players, function(p)
      return player:inMyAttackRange(p)
    end)
    player:drawCards(n, qingping.name)
  end,
})

return qingping
