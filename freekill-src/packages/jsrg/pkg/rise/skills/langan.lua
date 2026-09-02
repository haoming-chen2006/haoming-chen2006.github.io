local langan = fk.CreateSkill {
  name = "langan",
  tags = { Skill.Compulsory },
}

Fk:loadTranslationTable{
  ["langan"] = "阑干",
  [":langan"] = "锁定技，当其他角色死亡后，你回复1点体力并摸两张牌，然后你的攻击范围-1（至多减3）。",
}

langan:addEffect(fk.Deathed, {
  anim_type = "support",
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(langan.name)
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    if player:isWounded() then
      room:recover{
        who = player,
        num = 1,
        recoverBy = player,
        skillName = langan.name,
      }
      if player.dead then return end
    end
    player:drawCards(2, langan.name)
    if not player.dead and player:getMark(langan.name) < 3 then
      room:addPlayerMark(player, langan.name, 1)
    end
  end,
})

langan:addEffect("atkrange", {
  correct_func = function (self, from, to)
    return -from:getMark(langan.name)
  end,
})

return langan
