local yinlue = fk.CreateSkill {
  name = "yinlue",
}

Fk:loadTranslationTable{
  ["yinlue"] = "隐略",
  [":yinlue"] = "每轮每项各限一次，当一名角色受到火焰/雷电伤害时，你可以防止此伤害，此回合结束后你执行一个仅有摸牌/弃牌阶段的额外回合。",

  ["#yinlue-ask"] = "隐略：你可以防止 %dest 受到的伤害，回合结束后执行一个仅有%arg的额外回合",
}

yinlue:addEffect(fk.DamageInflicted, {
  anim_type = "support",
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(yinlue.name) and
      (data.damageType == fk.ThunderDamage or data.damageType == fk.FireDamage) and
      not table.contains(player:getTableMark("yinlue-round"), data.damageType)
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local phase = data.damageType == fk.FireDamage and "phase_draw" or "phase_discard"
    if room:askToSkillInvoke(player, {
      skill_name = yinlue.name,
      prompt = "#yinlue-ask::"..target.id..":"..phase,
    }) then
      event:setCostData(self, {tos = {target}})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    room:addTableMark(player, "yinlue-round", data.damageType)
    data:preventDamage()
    if room.logic:getCurrentEvent():findParent(GameEvent.Turn, true) then
      local phase = data.damageType == fk.FireDamage and Player.Draw or Player.Discard
      player:gainAnExtraTurn(true, yinlue.name, { phase })
    end
  end,
})

return yinlue
