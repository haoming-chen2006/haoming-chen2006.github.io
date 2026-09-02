
local juyi = fk.CreateSkill {
  name = "juyi",
  tags = { Skill.Wake },
}

Fk:loadTranslationTable{
  ["juyi"] = "举义",
  [":juyi"] = "觉醒技，准备阶段开始时，若你已受伤且体力上限大于存活角色数，你将手牌摸至体力上限，然后获得技能〖崩坏〗和〖威重〗。",

  ["$juyi1"] = "司马氏篡权，我当替天伐之！",
  ["$juyi2"] = "若国有难，吾当举义。",
}

juyi:addEffect(fk.EventPhaseStart, {
  anim_type = "drawcard",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(juyi.name) and
      player.phase == Player.Start and
      player:usedSkillTimes(juyi.name, Player.HistoryGame) == 0
  end,
  can_wake = function(self, event, target, player, data)
    return player:isWounded() and player.maxHp > #player.room.alive_players
  end,
  on_use = function(self, event, target, player, data)
    local n = player.maxHp - player:getHandcardNum()
    if n > 0 then
      player:drawCards(n, juyi.name)
      if player.dead then return end
    end
    player.room:handleAddLoseSkills(player, "benghuai|weizhong")
  end,
})

return juyi
