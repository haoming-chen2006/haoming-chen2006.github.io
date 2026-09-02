local wuji = fk.CreateSkill {
  name = "wuji",
  tags = { Skill.Wake },
}

Fk:loadTranslationTable {
  ["wuji"] = "武继",
  [":wuji"] = "觉醒技，结束阶段，若本回合你已造成3点或更多伤害，你加1点体力上限并回复1点体力，然后失去技能〖虎啸〗。",

  ["$wuji1"] = "我感受到了，父亲的力量。",
  ["$wuji2"] = "我也要像父亲那样坚强。",
}

wuji:addEffect(fk.EventPhaseStart, {
  anim_type = "support",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(wuji.name) and
      player.phase == Player.Finish and
      player:usedSkillTimes(wuji.name, Player.HistoryGame) == 0
  end,
  can_wake = function(self, event, target, player, data)
    local n = 0
    player.room.logic:getActualDamageEvents(1, function(e)
      local damage = e.data
      if damage.from == player then
        n = n + damage.damage
      end
    end)
    return n > 2
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    room:changeMaxHp(player, 1)
    if player:isWounded() and not player.dead then
      room:recover{
        who = player,
        num = 1,
        recoverBy = player,
        skillName = wuji.name
      }
    end
    if player.dead then return end
    room:handleAddLoseSkills(player, "-huxiao")
  end,
})

return wuji
