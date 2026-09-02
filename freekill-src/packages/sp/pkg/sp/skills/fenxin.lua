local fenxin = fk.CreateSkill {
  name = "fenxin",
  tags = { Skill.Limited },
}

Fk:loadTranslationTable {
  ["fenxin"] = "焚心",
  [":fenxin"] = "限定技，当你杀死一名非主公角色时，在其翻开身份牌之前，你可以与该角色交换身份牌。（你的身份为主公时不能发动此技能。）",

  ["#fenxin-invoke"] = "焚心：你可以与 %dest 交换身份牌！",

  ["$fenxin1"] = "主上，这是最后的机会……",
  ["$fenxin2"] = "杀人，诛心。",
}

fenxin:addEffect(fk.BeforeGameOverJudge, {
  anim_type = "offensive",
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(fenxin.name) and player:usedSkillTimes(fenxin.name, Player.HistoryGame) == 0 and
      data.killer == player and
      player.role ~= "lord" and target.role ~= "lord"
  end,
  on_cost = function(self, event, target, player, data)
    return player.room:askToSkillInvoke(player, {
      skill_name = fenxin.name,
      prompt = "#fenxin-invoke::"..target.id
    })
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local playerRole, targetRole = target.role, player.role
    room:changeRole(player, playerRole)
    room:changeRole(target, targetRole)
  end,
})

return fenxin
