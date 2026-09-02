local ruoyu = fk.CreateSkill {
  name = "ruoyu",
  tags = {Skill.Wake, Skill.Lord},
  related_skills = { "jijiang" },
}

Fk:loadTranslationTable{
  ["ruoyu"] = "若愚",
  [":ruoyu"] = "主公技，觉醒技，准备阶段开始时，若你是体力值最小的角色，你加1点体力上限，然后回复1点体力，获得〖激将〗。",

  ["$ruoyu1"] = "不装疯卖傻，岂能安然无恙？",
  ["$ruoyu2"] = "世人皆错看我，唉！",
}

ruoyu:addEffect(fk.EventPhaseStart, {
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(ruoyu.name) and
      player:usedSkillTimes(ruoyu.name, Player.HistoryGame) == 0 and
      player.phase == Player.Start
  end,
  can_wake = function(self, event, target, player, data)
    return table.every(player.room:getOtherPlayers(player, false), function(p)
      return p.hp >= player.hp
    end)
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
        skillName = ruoyu.name,
      }
    end
    if player.dead then return end
    room:handleAddLoseSkills(player, "jijiang", nil, true, false)
  end,
})

return ruoyu
