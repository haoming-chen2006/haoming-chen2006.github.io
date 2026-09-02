local baiyin = fk.CreateSkill {
  name = "baiyin",
  tags = { Skill.Wake },
  related_skills = { "jilue" },
}

Fk:loadTranslationTable{
  ["baiyin"] = "拜印",
  [":baiyin"] = "觉醒技，准备阶段，若你的“忍”数大于3，你减1点体力上限，获得〖极略〗。",

  ["$baiyin1"] = "老骥伏枥，志在千里！",
  ["$baiyin2"] = "烈士暮年，壮心不已！",
}

baiyin:addEffect(fk.EventPhaseStart, {
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(baiyin.name) and
      player.phase == Player.Start and
      player:usedSkillTimes(baiyin.name, Player.HistoryGame) == 0
  end,
  can_wake = function(self, event, target, player, data)
    return player:getMark("@godsimayi_bear") > 3
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    room:changeMaxHp(player, -1)
    if player.dead then return end
    room:handleAddLoseSkills(player, "jilue", nil, true, false)
  end,
})

return baiyin
