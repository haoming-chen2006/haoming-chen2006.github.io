local pingkou = fk.CreateSkill {
  name = "pingkou",
}

Fk:loadTranslationTable{
  ["pingkou"] = "平寇",
  [":pingkou"] = "回合结束时，你可以对至多X名其他角色各造成1点伤害（X为你本回合跳过的阶段数）。",

  ["#pingkou-choose"] = "平寇：你可以对至多%arg名角色各造成1点伤害",

  ["$pingkou1"] = "对敌人仁慈，就是对自己残忍。",
  ["$pingkou2"] = "反守为攻，直捣黄龙！",
}

pingkou:addEffect(fk.TurnEnd, {
  anim_type = "offensive",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(pingkou.name) and
      table.find(data.phase_table, function(phase)
        return phase.who == player and phase.skipped
      end)
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local n = #table.filter(data.phase_table, function(phase)
      return phase.who == player and phase.skipped
    end)
    local tos = room:askToChoosePlayers(player, {
      min_num = 1,
      max_num = n,
      targets = room:getOtherPlayers(player, false),
      skill_name = pingkou.name,
      prompt = "#pingkou-choose:::" .. n,
      cancelable = true,
    })
    if #tos > 0 then
      room:sortByAction(tos)
      event:setCostData(self, {tos = tos})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local tos = event:getCostData(self).tos
    for _, p in ipairs(tos) do
      if not p.dead then
        room:damage{
          from = player,
          to = p,
          damage = 1,
          skillName = pingkou.name,
        }
      end
    end
  end,
})

return pingkou
