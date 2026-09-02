local hunzi = fk.CreateSkill({
  name = "mou__hunzi",
  tags = { Skill.Wake },
  related_skills = { "mou__yingzi", "yinghun" }
})

Fk:loadTranslationTable{
  ["mou__hunzi"] = "魂姿",
  [":mou__hunzi"] = "觉醒技，当你脱离濒死状态时，你减1点体力上限，获得1点护甲，摸三张牌，然后获得〖英姿〗和〖英魂〗。",

  ["$mou__hunzi1"] = "群雄逐鹿之时，正是吾等崭露头角之日！",
  ["$mou__hunzi2"] = "胸中远志几时立，正逢建功立业时！",
}

hunzi:addEffect(fk.AfterDying, {
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(hunzi.name) and
      player:usedSkillTimes(hunzi.name, Player.HistoryGame) == 0
  end,
  can_wake = Util.TrueFunc,
  on_use = function(self, event, target, player, data)
    local room = player.room
    room:changeMaxHp(player, -1)
    if player.dead then return false end
    room:changeShield(player, 1)
    if player.dead then return false end
    room:drawCards(player, 3, hunzi.name)
    if player.dead then return false end
    room:handleAddLoseSkills(player, "mou__yingzi|yinghun")
  end,
})

return hunzi
