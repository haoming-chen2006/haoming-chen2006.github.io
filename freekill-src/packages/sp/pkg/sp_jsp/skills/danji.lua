local danji = fk.CreateSkill {
  name = "danji",
  tags = { Skill.Wake },
}

Fk:loadTranslationTable{
  ["danji"] = "单骑",
  [":danji"] = "觉醒技，准备阶段开始时，若你的手牌数大于体力值且本局游戏的主公不是刘备，你须减1点体力上限，然后获得技能〖马术〗和〖怒斩〗。",

  ["$danji1"] = "单骑护嫂千里，只为桃园之义！",
  ["$danji2"] = "独身远涉，赤心归国！",
}

danji:addEffect(fk.EventPhaseStart, {
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(danji.name) and
      player.phase == Player.Start and
      player:usedSkillTimes(danji.name, Player.HistoryGame) == 0
  end,
  can_wake = function(self, event, target, player, data)
    return player:getHandcardNum() > player.hp and
      not (string.find(player.room:getLord().general, "liubei") or string.find(player.room:getLord().deputyGeneral, "liubei"))
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    room:changeMaxHp(player, -1)
    if player.dead then return end
    room:handleAddLoseSkills(player, "mashu|nuzhan")
  end,
})

return danji
