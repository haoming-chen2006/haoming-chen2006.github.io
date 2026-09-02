
local benxi = fk.CreateSkill {
  name = "benxi",
  tags = { Skill.Compulsory },
}

Fk:loadTranslationTable{
  ["benxi"] = "奔袭",
  [":benxi"] = "锁定技，当你于回合内使用牌时，本回合你计算与其他角色的距离-1；你的回合内，若你与所有其他角色的距离均为1，则你无视其他角色的防具"..
  "且你使用【杀】可以多指定一个目标。",

  ["@benxi-turn"] = "奔袭",
  ["#benxi-choose"] = "奔袭：你可以为此%arg多指定一个目标",

  ["$benxi1"] = "奔战万里，袭关斩将。",
  ["$benxi2"] = "袭敌千里，溃敌百步！",
}

benxi:addEffect(fk.CardUsing, {
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(benxi.name) and player.room.current == player
  end,
  on_use = function(self, event, target, player, data)
    player.room:addPlayerMark(player, "@benxi-turn", 1)
  end,
})

benxi:addEffect(fk.AfterCardTargetDeclared, {
  mute = true,
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(benxi.name) and data.card.trueName == "slash" and player.room.current == player and
      table.every(player.room:getOtherPlayers(player, false), function(p)
        return player:distanceTo(p) == 1
      end) and
      #data:getExtraTargets() > 0
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local to = room:askToChoosePlayers(player, {
      min_num = 1,
      max_num = 1,
      targets = data:getExtraTargets(),
      prompt = "#benxi-choose:::" .. data.card:toLogString(),
      skill_name = benxi.name,
    })
    if #to > 0 then
      event:setCostData(self, { tos = to })
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    data:addTarget(event:getCostData(self).tos[1])
  end,
})

benxi:addEffect("invalidity", {
  invalidity_func = function(self, player, skill)
    if skill:getSkeleton().attached_equip and Fk:cloneCard(skill:getSkeleton().attached_equip).sub_type == Card.SubtypeArmor then
      if RoomInstance then
        local skill_owner = RoomInstance.current
        if not (skill_owner:hasSkill(benxi.name) and
        table.every(RoomInstance.alive_players, function(p)
          return skill_owner:distanceTo(p) < 2
        end)) then return false end
        local logic = RoomInstance.logic
        local event = logic:getCurrentEvent()
        repeat
          if event.event == GameEvent.SkillEffect then
            if not event.data.skill.cardSkill then
              return event.data.who == skill_owner
            end
          elseif event.event == GameEvent.Damage then
            local damage = event.data
            return damage.to == player and damage.from == skill_owner
          elseif event.event == GameEvent.UseCard then
            local use = event.data
            return use.from == skill_owner and table.contains(use.tos, player)
          end
          event = event.parent
        until event == nil
      end
    end
  end,
})

benxi:addEffect("distance", {
  correct_func = function(self, from, to)
    return -from:getMark("@benxi-turn")
  end,
})

return benxi
