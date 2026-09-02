local huilie = fk.CreateSkill {
  name = "huilie",
  tags = { Skill.Wake },
}

Fk:loadTranslationTable{
  ["huilie"] = "会猎",
  [":huilie"] = "觉醒技，准备阶段，若有“猎”的角色数大于2，你减1点体力上限，然后获得〖平戎〗和〖飞影〗。",

  ["$huilie1"] = "孤上承天命，会猎于江夏，幸勿观望。",
  ["$huilie2"] = "今雄兵百万，奉词伐罪，敢不归顺？",
}

huilie:addEffect(fk.EventPhaseStart, {
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(huilie.name) and
      player.phase == Player.Start and
      player:usedSkillTimes(huilie.name, Player.HistoryGame) == 0
  end,
  can_wake = function(self, event, target, player, data)
    return #table.filter(player.room.alive_players, function (p)
      return p:getMark("@@caocao_lie") > 0
    end) > 2
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    room:changeMaxHp(player, -1)
    if not player.dead then
      room:handleAddLoseSkills(player, "pingrong|feiying")
    end
  end,
})

return huilie
