local danji = fk.CreateSkill {
  name = "sp__danji",
  tags = { Skill.Wake },
}

Fk:loadTranslationTable{
  ["sp__danji"] = "单骑",
  [":sp__danji"] = "觉醒技，回合开始阶段，若你的手牌数大于你当前体力值，且本局游戏的主公为曹操时，你须减1点体力上限并永久获得技能〖马术〗。",
}

danji:addEffect(fk.EventPhaseStart, {
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(danji.name) and
      player.phase == Player.Start and
      player:usedSkillTimes(danji.name, Player.HistoryGame) == 0
  end,
  can_wake = function(self, event, target, player, data)
    return player:getHandcardNum() > player.hp and
      (string.find(player.room:getLord().general, "caocao") or string.find(player.room:getLord().deputyGeneral, "caocao"))
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    room:changeMaxHp(player, -1)
    if player.dead then return end
    room:handleAddLoseSkills(player, "mashu")
  end,
})

return danji
