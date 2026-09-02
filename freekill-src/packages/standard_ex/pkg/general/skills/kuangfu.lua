Fk:loadTranslationTable{
  ["std__kuangfu"] = "狂斧",
  [":std__kuangfu"] = "锁定技，每阶段限一次，当你于出牌阶段使用【杀】对其他角色造成伤害后，若其体力值：小于你，你摸两张牌；"..
  "不小于你，你失去1点体力。",

  ["$std__kuangfu1"] = "吾乃上将潘凤，可斩华雄！",
  ["$std__kuangfu2"] = "这家伙还是给我用吧！",
}

local kuangfu = fk.CreateSkill{
  name = "std__kuangfu",
  tags = { Skill.Compulsory },
}

kuangfu:addEffect(fk.Damage, {
  mute = true,
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(kuangfu.name) and
      data.card and data.card.trueName == "slash" and player.phase == Player.Play and
      player:usedSkillTimes(kuangfu.name, Player.HistoryPhase) == 0
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    player:broadcastSkillInvoke(kuangfu.name)
    if data.to.hp < player.hp then
      room:notifySkillInvoked(player, kuangfu.name, "drawcard")
      player:drawCards(2, kuangfu.name)
    else
      room:notifySkillInvoked(player, kuangfu.name, "negative")
      player.room:loseHp(player, 1, kuangfu.name)
    end
  end,
})

return kuangfu
