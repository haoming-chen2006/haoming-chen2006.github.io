local mouHujia = fk.CreateSkill({
  name = "mou__hujia",
  tags = { Skill.Lord },
})

Fk:loadTranslationTable{
  ["mou__hujia"] = "护驾",
  [":mou__hujia"] = "主公技，每轮限一次，当你受到伤害时，你可以将此伤害转移给一名其他魏势力角色。",

  ["#mou__hujia-choose"] = "护驾：你可以将伤害转移给一名魏势力角色",

  ["$mou__hujia1"] = "虎贲三千，堪当敌万余！",
  ["$mou__hujia2"] = "壮士八百，足护卫吾身！",
}

mouHujia:addEffect(fk.DetermineDamageInflicted, {
  anim_type = "defensive",
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(mouHujia.name) and target == player and player:usedSkillTimes(mouHujia.name, Player.HistoryRound) == 0
  end,
  on_cost = function(self, event, target, player, data)
    local targets = table.filter(player.room:getOtherPlayers(player, false), function(p) return p.kingdom == "wei" end)
    if #targets > 0 then
      local to = player.room:askToChoosePlayers(
        player,
        {
          targets = targets,
          min_num = 1,
          max_num = 1,
          prompt = "#mou__hujia-choose",
          skill_name = mouHujia.name
        }
      )
      if #to > 0 then
        event:setCostData(self, { tos = to })
        return true
      end
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local to = event:getCostData(self).tos[1]

    local damage = data.damage
    data:preventDamage()
    room:damage{
      from = data.from,
      to = to,
      damage = damage,
      damageType = data.damageType,
      skillName = data.skillName,
      chain = data.chain,
      card = data.card,
    }
  end,
})

return mouHujia
