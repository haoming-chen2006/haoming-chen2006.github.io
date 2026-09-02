local kuanggu = fk.CreateSkill({
  name = "kuanggu",
  tags = {Skill.Compulsory},
})

Fk:loadTranslationTable{
  ["kuanggu"] = "狂骨",
  [":kuanggu"] = "锁定技，当你对距离1以内的一名角色造成1点伤害后，你回复1点体力。",

  ["$kuanggu1"] = "我会怕你吗！",
  ["$kuanggu2"] = "真是美味啊！",
}

kuanggu:addEffect(fk.Damage, {
  anim_type = "support",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(kuanggu.name) and (data.extra_data or {}).kuanggucheck and player:isWounded()
  end,
  trigger_times = function(self, event, target, player, data)
    return data.damage
  end,
  on_use = function(self, event, target, player, data)
    player.room:recover{
      who = player,
      num = 1,
      recoverBy = player,
      skillName = kuanggu.name,
    }
  end,
})

kuanggu:addEffect(fk.BeforeHpChanged, {
  can_refresh = function(self, event, target, player, data)
    return data.damageEvent and player == data.damageEvent.from and player:compareDistance(target, 2, "<")
  end,
  on_refresh = function(self, event, target, player, data)
    data.damageEvent.extra_data = data.damageEvent.extra_data or {}
    data.damageEvent.extra_data.kuanggucheck = true
  end,
})

kuanggu:addTest(function (room, me)
  FkTest.runInRoom(function ()
    room:handleAddLoseSkills(me, kuanggu.name)
    room:loseHp(me, 3)
    room:damage({ from = me, to = room.players[2], damage = 1})
    room:damage({ from = me, to = room.players[3], damage = 1})
  end)
  lu.assertEquals(me.hp, 2)
end)

return kuanggu
