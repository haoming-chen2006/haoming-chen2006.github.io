local dujiang = fk.CreateSkill({
  name = "dujiang",
  tags = { Skill.Wake },
  related_skills = { "duojing" },
})

Fk:loadTranslationTable{
  ["dujiang"] = "渡江",
  [":dujiang"] = "觉醒技，准备阶段，若你的护甲值不小于3，你获得技能〖夺荆〗。",

  ["$dujiang1"] = "大军渡江，昼夜驰上！",
  ["$dujiang2"] = "白衣摇橹，昼夜兼行！",
}

dujiang:addEffect(fk.EventPhaseStart, {
  anim_type = "drawcard",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(dujiang.name) and player.phase == Player.Start and
      player:usedSkillTimes(dujiang.name, Player.HistoryGame) == 0
  end,
  can_wake = function(self, event, target, player, data)
    return player.shield >= 3
  end,
  on_use = function(self, event, target, player, data)
    player.room:handleAddLoseSkills(player, "duojing")
  end,
})

return dujiang
