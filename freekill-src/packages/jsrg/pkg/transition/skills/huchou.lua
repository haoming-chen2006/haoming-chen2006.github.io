local huchou = fk.CreateSkill {
  name = "huchou",
  tags = { Skill.Compulsory },
}

Fk:loadTranslationTable{
  ["huchou"] = "互雠",
  [":huchou"] = "锁定技，上一名对你使用伤害类牌的其他角色受到你造成的伤害时，此伤害+1。",

  ["@[chara]huchou"] = "互雠",
}

huchou:addEffect(fk.DamageInflicted, {
  anim_type = "offensive",
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(huchou.name) and data.from and data.from == player and player:getMark("@[chara]huchou") == target.id
  end,
  on_use = function(self, event, target, player, data)
    data:changeDamage(1)
  end,
})

huchou:addEffect(fk.TargetConfirmed, {
  can_refresh = function(self, event, target, player, data)
    return target == player and player:hasSkill(huchou.name, true) and
      data.card.is_damage_card and data.from ~= player
  end,
  on_refresh = function(self, event, target, player, data)
    local room = player.room
    room:setPlayerMark(player, "@[chara]huchou", data.from.id)
  end,
})

huchou:addAcquireEffect(function (self, player, is_start)
  local room = player.room
  room.logic:getEventsByRule(GameEvent.UseCard, 1, function (e)
    local use = e.data
    if use.card.is_damage_card and table.contains(use.tos, player) and use.from ~= player then
      room:setPlayerMark(player, "@[chara]huchou", use.from.id)
      return true
    end
  end, Player.HistoryGame)
end)

huchou:addLoseEffect(function (self, player, is_death)
  local room = player.room
  room:setPlayerMark(player, "@[chara]huchou", 0)
end)

return huchou
