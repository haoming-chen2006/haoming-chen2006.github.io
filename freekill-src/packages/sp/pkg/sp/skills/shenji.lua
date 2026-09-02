local shenji = fk.CreateSkill {
  name = "shenji",
}

Fk:loadTranslationTable {
  ["shenji"] = "神戟",
  [":shenji"] = "你使用【杀】的次数上限+1，额定目标数上限+2。",

  ["$shenji1"] = "杂鱼们，都去死吧！",
  ["$shenji2"] = "竟想赢我，痴人说梦！",
}

shenji:addEffect("targetmod", {
  residue_func = function(self, player, skill, scope)
    if player:hasSkill(shenji.name) and skill.trueName == "slash_skill" and scope == Player.HistoryPhase then
      return 1
    end
  end,
  extra_target_func = function(self, player, skill)
    if player:hasSkill(shenji.name) and skill.trueName == "slash_skill" then
      return 2
    end
  end,
})

return shenji
