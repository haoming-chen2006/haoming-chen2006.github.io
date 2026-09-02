Fk:loadTranslationTable{
  ["ex__paoxiao"] = "咆哮",
  [":ex__paoxiao"] = "锁定技，你使用【杀】无次数限制；当你使用的【杀】被抵消后，你本回合下次【杀】造成的伤害+1。",

  ["@paoxiao-turn"] = "咆哮",

  ["$ex__paoxiao1"] = "喝啊！",
  ["$ex__paoxiao2"] = "今，必斩汝马下！",
}

local paoxiao = fk.CreateSkill{
  name = "ex__paoxiao",
  tags = { Skill.Compulsory },
}

paoxiao:addEffect("targetmod", {
  bypass_times = function(self, player, skill, scope, card)
    return player:hasSkill(paoxiao.name) and card and skill.trueName == "slash_skill" and scope == Player.HistoryPhase
  end,
})

paoxiao:addEffect(fk.CardUsing, {
  can_refresh = function(self, event, target, player, data)
    return target == player and player:hasSkill(paoxiao.name) and
      data.card.trueName == "slash" and player:usedCardTimes("slash") > 1
  end,
  on_refresh = function(self, event, target, player, data)
    player:broadcastSkillInvoke(paoxiao.name)
    player.room:notifySkillInvoked(player, paoxiao.name, "offensive")
  end,
})

paoxiao:addEffect(fk.CardEffectCancelledOut, {
  mute = true,
  can_trigger = function(self, event, target, player, data)
    return player == target and data.card.trueName == "slash" and player:hasSkill(paoxiao.name)
  end,
  on_use = function(self, event, target, player, data)
    player.room:addPlayerMark(player, "@paoxiao-turn")
  end,
})

paoxiao:addEffect(fk.DamageCaused, {
  mute = true,
  is_delay_effect = true,
  can_trigger = function(self, event, target, player, data)
    return player == target and data.card and data.card.trueName == "slash" and player.room.logic:damageByCardEffect() and
    player:getMark("@paoxiao-turn") > 0 and player:hasSkill(paoxiao.name)
  end,
  on_use = function(self, event, target, player, data)
    data:changeDamage(player:getMark("@paoxiao-turn"))
    player.room:setPlayerMark(player, "@paoxiao-turn", 0)
  end,
})

return paoxiao
