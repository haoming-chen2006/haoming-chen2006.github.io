local furan = fk.CreateSkill {
  name = "furan",
}

Fk:loadTranslationTable{
  ["furan"] = "复燃",
  [":furan"] = "当你受到伤害后，若你不在伤害来源攻击范围内，你可以于此回合结束时回复1点体力。",
}

furan:addEffect(fk.Damaged, {
  anim_type = "masochism",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(furan.name) and
      data.from and (data.from.dead or not data.from:inMyAttackRange(player))
  end,
})

furan:addEffect(fk.TurnEnd, {
  anim_type = "support",
  is_delay_effect = true,
  can_trigger = function(self, event, target, player, data)
    return player:usedSkillTimes(furan.name, Player.HistoryTurn) > 0 and player:isWounded() and not player.dead
  end,
  on_use = function (self, event, target, player, data)
    player.room:recover{
      who = player,
      num = player:usedSkillTimes(furan.name, Player.HistoryTurn),
      recoverBy = player,
      skill_name = furan.name,
    }
  end,
})

return furan
