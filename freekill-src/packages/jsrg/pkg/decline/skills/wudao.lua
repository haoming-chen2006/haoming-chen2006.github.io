local wudao = fk.CreateSkill {
  name = "js__wudao",
  tags = { Skill.Wake },
}

Fk:loadTranslationTable{
  ["js__wudao"] = "悟道",
  [":js__wudao"] = "觉醒技，当一名角色进入濒死状态时，若你没有手牌，你增加1点体力上限并回复1点体力，获得〖惊雷〗。",
}

wudao:addEffect(fk.EnterDying, {
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(wudao.name) and player:usedSkillTimes(wudao.name, Player.HistoryGame) == 0
  end,
  can_wake = function(self, event, target, player, data)
    return player:isKongcheng()
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    room:changeMaxHp(player, 1)
    if player.dead then return end
    if player:isWounded() then
      room:recover{
        who = player,
        num = 1,
        recoverBy = player,
        skillName = wudao.name,
      }
    end
    if player.dead then return end
    room:handleAddLoseSkills(player, "js__jinglei")
  end,
})

return wudao
