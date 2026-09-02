local zili = fk.CreateSkill {
  name = "zili",
  tags = { Skill.Wake },
}

Fk:loadTranslationTable{
  ["zili"] = "自立",
  [":zili"] = "觉醒技，准备阶段，若“权”的数量达到3或更多，你须减1点体力上限，然后回复1点体力或摸两张牌，并获得技能〖排异〗。",

  ["$zili1"] = "时机已到，今日起兵！",
  ["$zili2"] = "欲取天下，当在此时！"
}

zili:addEffect(fk.EventPhaseStart, {
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(zili.name) and
      player.phase == Player.Start and
      player:usedSkillTimes(zili.name, Player.HistoryGame) == 0
  end,
  can_wake = function(self, event, target, player, data)
    return #player:getPile("zhonghui_quan") > 2
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    room:changeMaxHp(player, -1)
    if player.dead then return end
    local choices = {"draw2"}
    if player:isWounded() then
      table.insert(choices, "recover")
    end
    local choice = room:askToChoice(player, {
      choices = choices,
      skill_name = zili.name
    })
    if choice == "draw2" then
      player:drawCards(2, zili.name)
    else
      room:recover{
        who = player,
        num = 1,
        recoverBy = player,
        skillName = zili.name,
      }
    end
    if player.dead then return end
    room:handleAddLoseSkills(player, "paiyi")
  end,
})

return zili
