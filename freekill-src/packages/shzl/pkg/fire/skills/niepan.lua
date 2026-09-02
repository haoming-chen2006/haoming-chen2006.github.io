local niepan = fk.CreateSkill {
  name = "niepan",
  tags = { Skill.Limited },
}

Fk:loadTranslationTable{
  ["niepan"] = "涅槃",
  [":niepan"] = "限定技，当你处于濒死状态时，你可以弃置区域里的所有牌，复原你的武将牌，然后摸三张牌并将体力回复至3点。",

  ["$niepan1"] = "凤雏岂能消亡？",
  ["$niepan2"] = "浴火重生！",
}

niepan:addEffect(fk.AskForPeaches, {
  anim_type = "defensive",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(niepan.name) and player.dying and
      player:usedSkillTimes(niepan.name, Player.HistoryGame) == 0
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    player:throwAllCards("hej")
    if player.dead then return end
    player:reset()
    if player.dead then return end
    player:drawCards(3, niepan.name)
    if player.dead or player.hp > 2 then return end
    room:recover{
      who = player,
      num = math.min(3, player.maxHp) - player.hp,
      recoverBy = player,
      skillName = niepan.name,
    }
  end,
})

return niepan
