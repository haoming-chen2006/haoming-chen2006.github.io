Fk:loadTranslationTable{
  ["qinxue"] = "勤学",
  [":qinxue"] = "觉醒技，准备阶段，若你的手牌数比体力值多3或更多（游戏人数大于7则改为2），你减1点体力上限，然后获得技能〖攻心〗。",

  ["$qinxue1"] = "兵书熟读，了然于胸。",
  ["$qinxue2"] = "勤以修身，学以报国。",
}

local qinxue = fk.CreateSkill{
  name = "qinxue",
  tags = { Skill.Wake },
}

qinxue:addEffect(fk.EventPhaseStart, {
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(self) and
      player.phase == Player.Start and
      player:usedSkillTimes(qinxue.name, Player.HistoryGame) == 0
  end,
  can_wake = function(self, event, target, player, data)
    return (player:getHandcardNum() - player.hp > 2) or
      (#player.room.players > 7 and player:getHandcardNum() - player.hp > 1)
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    room:changeMaxHp(player, -1)
    if player.dead then return end
    room:handleAddLoseSkills(player, "gongxin", nil)
  end,
})

return qinxue
