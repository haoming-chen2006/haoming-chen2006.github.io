
local zhaxiang = fk.CreateSkill{
  name = "zhaxiang",
  tags = { Skill.Compulsory },
}

Fk:loadTranslationTable{
  ["zhaxiang"] = "诈降",
  [":zhaxiang"] = "锁定技，每当你失去1点体力，你摸三张牌，然后若此时是你的出牌阶段内，"..
  "则此阶段内你使用【杀】次数上限+1、使用红色【杀】无距离限制且不可被响应。",

  ["@@zhaxiang-phase"] = "诈降",

  ["$zhaxiang1"] = "铁锁连舟而行，东吴水师可破！",
  ["$zhaxiang2"] = "两军阵前，不斩降将！",
}

zhaxiang:addEffect(fk.HpLost, {
  anim_type = "drawcard",
  trigger_times = function(self, event, target, player, data)
    return data.num
  end,
  on_use = function(self, event, target, player, data)
    player:drawCards(3, zhaxiang.name)
    if player.phase == Player.Play then
      local room = player.room
      room:setPlayerMark(player, "@@zhaxiang-phase", 1)
      room:addPlayerMark(player, MarkEnum.SlashResidue.."-phase")
    end
  end,
})

zhaxiang:addEffect(fk.PreCardUse, {
  can_refresh = function(self, event, target, player, data)
    return player == target and player.phase == Player.Play and
      data.card.trueName == "slash" and data.card.color == Card.Red and
      player:usedSkillTimes(zhaxiang.name, Player.HistoryPhase) > 0
  end,
  on_refresh = function(self, event, target, player, data)
    data.disresponsiveList = table.simpleClone(player.room.alive_players)
  end,
})

zhaxiang:addEffect("targetmod", {
  bypass_distances =  function(self, player, skill, card)
    return card and card:matchVSPattern("slash|.|red") and player.phase == Player.Play and
      player:usedSkillTimes(zhaxiang.name, Player.HistoryPhase) > 0
  end,
})

return zhaxiang
