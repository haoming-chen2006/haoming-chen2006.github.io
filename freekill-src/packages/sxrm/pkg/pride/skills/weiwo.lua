local weiwo = fk.CreateSkill {
  name = "weiwo",
  tags = { Skill.Limited },
}

Fk:loadTranslationTable{
  ["weiwo"] = "唯我",
  [":weiwo"] = "限定技，结束阶段开始时，你可以令至多三名其他角色分别获得“<a href=':sx__rende'>仁德</a>”、" ..
  "“<a href=':sx__qingnang'>青囊</a>”、“<a href=':sx__longyin'>龙吟</a>”中的一个不同技能，这些技能仅能对你发动，" ..
  "然后你获得技能“<a href=':wushen'>武神</a>”。",

  ["#weiwo-choose"] = "唯我：你可以选择其中一名角色，令其获得左侧所示技能",
  ["#WeiWoGiveSkill"] = "%from 发动了“唯我”，令 %to 获得技能“%arg”",
}

weiwo:addEffect(fk.EventPhaseStart, {
  anim_type = "support",
  can_trigger = function(self, event, target, player, data)
    return
      target == player and
      player.phase == Player.Finish and
      player:hasSkill(weiwo.name) and
      player:usedSkillTimes(weiwo.name, Player.HistoryGame) == 0 and
      table.find(player.room.alive_players, function(p) return p ~= player end)
  end,
  on_cost = function(self, event, target, player, data)
    local success, dat = player.room:askToUseActiveSkill(
      player,
      {
        skill_name = "#weiwo_select",
        prompt = "#weiwo-choose",
        extra_data = { choices = { "sx__rende", "sx__qingnang", "sx__longyin" } },
      }
    )

    if success and dat and dat.interaction and #(dat.targets or {}) == 1 then
      event:setCostData(self, { tos = dat.targets, choice = dat.interaction })
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local choices = { "sx__rende", "sx__qingnang", "sx__longyin" }
    local to = event:getCostData(self).tos[1]
    local choice = event:getCostData(self).choice

    local exceptTargets = { to }
    room:sendLog{
      type = "#WeiWoGiveSkill",
      from = player.id,
      to = { to.id },
      arg = choice,
      toast = true,
    }
    if not to:hasSkill(choice, true) then
      room:setPlayerMark(to, "weiwo_owner_" .. choice, player.id)
      room:handleAddLoseSkills(to, choice)
    end
    table.removeOne(choices, choice)

    while #choices > 0 do
      local success, dat = player.room:askToUseActiveSkill(
        player,
        {
          skill_name = "#weiwo_select",
          prompt = "#weiwo-choose",
          extra_data = { choices = choices, exceptTargets = table.map(exceptTargets, Util.IdMapper) },
        }
      )

      if success and dat and dat.interaction and #(dat.targets or {}) == 1 then
        to = dat.targets[1]
        choice = dat.interaction
        room:doIndicate(player, { to })
        if not to:hasSkill(choice, true) then
          table.insertIfNeed(exceptTargets, to)
          room:sendLog{
            type = "#WeiWoGiveSkill",
            from = player.id,
            to = { to.id },
            arg = choice,
            toast = true,
          }
          room:setPlayerMark(to, "weiwo_owner_" .. choice, player.id)
          room:handleAddLoseSkills(to, choice)
        end

        table.removeOne(choices, choice)
      else
        break
      end
    end

    room:handleAddLoseSkills(player, "wushen")
  end,
})

return weiwo
