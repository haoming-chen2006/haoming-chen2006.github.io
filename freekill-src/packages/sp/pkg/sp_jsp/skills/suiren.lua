local suiren = fk.CreateSkill {
  name = "suiren",
  tags = { Skill.Limited },
}

Fk:loadTranslationTable{
  ["suiren"] = "随仁",
  [":suiren"] = "限定技，准备阶段，你可以失去技能〖义从〗，然后加1点体力上限并回复1点体力，令一名角色摸三张牌。",

  ["#suiren-choose"] = "随仁：你可以失去〖义从〗，加1点体力上限并回复1点体力，令一名角色摸三张牌",
}

suiren:addEffect(fk.EventPhaseStart, {
  anim_type = "support",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(suiren.name) and player.phase == Player.Start and
      player:usedSkillTimes(suiren.name, Player.HistoryGame) == 0 and
      player:hasSkill("yicong", true)
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local to = room:askToChoosePlayers(player, {
      skill_name = suiren.name,
      min_num = 1,
      max_num = 1,
      targets = room.alive_players,
      prompt = "#suiren-choose",
    })
    if #to > 0 then
      event:setCostData(self, {tos = to})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    room:handleAddLoseSkills(player, "-yicong")
    room:changeMaxHp(player, 1)
    if player:isWounded() and not player.dead then
      room:recover{
        who = player,
        num = 1,
        recoverBy = player,
        skillName = suiren.name,
      }
    end
    local to = event:getCostData(self).tos[1]
    if not to.dead then
      to:drawCards(3, suiren.name)
    end
  end,
})

return suiren
