Fk:loadTranslationTable{
  ["qianxin"] = "潜心",
  [":qianxin"] = "觉醒技，当你造成伤害后，若你已受伤，你减1点体力上限，并获得〖荐言〗。",

  ["$qianxin1"] = "既遇明主，天下可图！",
  ["$qianxin2"] = "弃武从文，安邦卫国！",
}

local qianxin = fk.CreateSkill{
  name = "qianxin",
  tags = { Skill.Wake },
}

qianxin:addEffect(fk.Damage, {
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(qianxin.name) and
      player:usedSkillTimes(qianxin.name, Player.HistoryGame) == 0
  end,
  can_wake = function(self, event, target, player, data)
    return player:isWounded()
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    room:changeMaxHp(player, -1)
    if not player.dead then
      room:handleAddLoseSkills(player, "jianyan")
    end
  end,
})
return qianxin
