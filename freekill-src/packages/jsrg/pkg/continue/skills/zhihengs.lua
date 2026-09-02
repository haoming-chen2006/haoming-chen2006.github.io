local zhihengs = fk.CreateSkill {
  name = "zhihengs",
  tags = { Skill.Compulsory },
}

Fk:loadTranslationTable{
  ["zhihengs"] = "猘横",
  [":zhihengs"] = "锁定技，当你使用牌对目标角色造成伤害时，若其本回合使用或打出牌响应过你使用的牌，此伤害+1。",

  ["$zhihengs1"] = "杀尽逆竖，何人还敢平视！",
  ["$zhihengs2"] = "畏罪而返，区区螳臂，我何惧之！",
}

zhihengs:addEffect(fk.DamageCaused, {
  anim_type = "offensive",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(zhihengs.name) and player.room.logic:damageByCardEffect() and
      (#player.room.logic:getEventsOfScope(GameEvent.UseCard, 1, function(e)
        local use = e.data
        return use.responseToEvent and use.responseToEvent.from == player and use.from == data.to
      end, Player.HistoryTurn) > 0 or
      #player.room.logic:getEventsOfScope(GameEvent.RespondCard, 1, function(e)
        local response = e.data
        return response.responseToEvent and response.responseToEvent.from == player and response.from == data.to
      end, Player.HistoryTurn) > 0)
  end,
  on_use = function(self, event, target, player, data)
    data:changeDamage(1)
  end,
})

return zhihengs
