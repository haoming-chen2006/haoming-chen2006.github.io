local hunzi = fk.CreateSkill {
  name = "hunzi",
  tags = {Skill.Wake},
  related_skills = { "yingzi", "yinghun" },
}

Fk:loadTranslationTable{
  ["hunzi"] = "魂姿",
  [":hunzi"] = "觉醒技，准备阶段，若你的体力值为1，你减1点体力上限，然后获得〖英姿〗和〖英魂〗。",

  ["$hunzi1"] = "父亲在上，魂佑江东；公瑾在旁，智定天下！",
  ["$hunzi2"] = "愿承父志，与公瑾共谋天下！",
}

hunzi:addEffect(fk.EventPhaseStart, {
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(hunzi.name) and
      player:usedSkillTimes(hunzi.name, Player.HistoryGame) == 0 and
      player.phase == Player.Start
  end,
  can_wake = function(self, event, target, player, data)
    return player.hp == 1
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    room:changeMaxHp(player, -1)
    if player.dead then return end
    room:handleAddLoseSkills(player, "yingzi|yinghun", nil, true, false)
  end,
})

return hunzi
