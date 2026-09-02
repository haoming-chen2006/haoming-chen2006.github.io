local mouZhichi = fk.CreateSkill({
  name = "mou__zhichi",
  tags = { Skill.Compulsory },
})

Fk:loadTranslationTable{
  ["mou__zhichi"] = "智迟",
  [":mou__zhichi"] = "锁定技，当你受到伤害后，防止本回合你受到的伤害。",
  ["@@mou__zhichi-turn"] = "智迟",
  ["#PreventDamageBySkill"] = "由于 %arg 的效果，%from 受到的伤害被防止",

  ["$mou__zhichi1"] = "哎！怪我智迟，竟少算一步。",
  ["$mou__zhichi2"] = "将军勿急，我等可如此行事。",
}

mouZhichi:addEffect(fk.Damaged, {
  anim_type = "defensive",
  on_use = function(self, event, target, player, data)
    player.room:setPlayerMark(player, "@@mou__zhichi-turn", 1)
  end,
})

mouZhichi:addEffect(fk.DetermineDamageInflicted, {
  is_delay_effect = true,
  can_trigger = function(self, event, target, player, data)
    return target == player and player:getMark("@@mou__zhichi-turn") > 0
  end,
  on_use = function(self, event, target, player, data)
    player.room:sendLog{ type = "#PreventDamageBySkill", from = player.id, arg = mouZhichi.name }
    data:preventDamage()
  end,
})

return mouZhichi
