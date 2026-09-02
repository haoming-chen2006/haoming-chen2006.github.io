local shishou = fk.CreateSkill {
  name = "js__shishou",
  tags = { Skill.Compulsory },
}

Fk:loadTranslationTable{
  ["js__shishou"] = "失守",
  [":js__shishou"] = "锁定技，当你使用【酒】时，你摸三张牌，然后你不能使用牌直到回合结束。当你受到火焰伤害后，〖仓储〗失效直到你回合结束。",

  ["@@js__shishou-turn"] = "失守 不能用牌",
}

shishou:addEffect(fk.CardUsing, {
  anim_type = "negative",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(shishou.name) and data.card.trueName == "analeptic"
  end,
  on_use = function(self, event, target, player, data)
    player.room:setPlayerMark(player, "@@js__shishou-turn", 1)
    player:drawCards(3, shishou.name)
  end,
})

shishou:addEffect(fk.Damaged, {
  anim_type = "negative",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(shishou.name) and
      data.damageType == fk.FireDamage and player:hasSkill("js__cangchu", true)
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    room:setPlayerMark(player, shishou.name, 1)
    room:invalidateSkill(player, "js__cangchu", nil, shishou.name)
  end,
})

shishou:addEffect(fk.TurnEnd, {
  late_refresh = true,
  can_refresh = function(self, event, target, player, data)
    return target == player and player:getMark(shishou.name) > 0
  end,
  on_refresh = function(self, event, target, player, data)
    local room = player.room
    room:setPlayerMark(player, shishou.name, 0)
    room:validateSkill(player, "js__cangchu", nil, shishou.name)
  end,
})

shishou:addEffect("prohibit", {
  prohibit_use = function(self, player, card)
    return card and player:getMark("@@js__shishou-turn") > 0
  end,
})

return shishou
