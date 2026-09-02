local zonghai = fk.CreateSkill {
  name = "zonghai",
}

Fk:loadTranslationTable{
  ["zonghai"] = "纵害",
  [":zonghai"] = "每轮限一次，当其他角色进入濒死状态时，你可以令其选择至多两名角色，未被选择的角色于此次濒死结算中不能使用牌。"..
  "此濒死结算结束后，你对其选择的角色各造成1点伤害。",

  ["#zonghai-invoke"] = "纵害：是否对 %dest 发动“纵害”，只有指定的角色才能在濒死结算中使用牌？",
  ["#zonghai-choose"] = "纵害：请选择至多两名角色，只有选择的角色能在本次濒死中使用牌，濒死结算后受到伤害",
  ["@@zonghai"] = "纵害",
}

zonghai:addEffect(fk.EnterDying, {
  anim_type = "offensive",
  can_trigger = function(self, event, target, player, data)
    return target ~= player and player:hasSkill(zonghai.name) and
      player:usedSkillTimes(zonghai.name, Player.HistoryRound) == 0 and
      target.dying and not target.dead
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    if room:askToSkillInvoke(player, {
      skill_name = zonghai.name,
      prompt = "#zonghai-invoke::" .. target.id,
    }) then
      event:setCostData(self, {tos = {target}})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local tos = room:askToChoosePlayers(target, {
      targets = room.alive_players,
      min_num = 1,
      max_num = 2,
      prompt = "#zonghai-choose",
      skill_name = zonghai.name,
      cancelable = false,
    })
    for _, to in ipairs(tos) do
      room:addTableMarkIfNeed(to, "@@zonghai", player.id)
    end

    local dying_event = room.logic:getCurrentEvent():findParent(GameEvent.Dying)
    if dying_event then
      dying_event:addCleaner(function()
        for _, p in ipairs(tos) do
          room:removeTableMark(p, "@@zonghai", player.id)
        end
      end)
    end

    data.extra_data = data.extra_data or {}
    data.extra_data.zonghaiUsed = data.extra_data.zonghaiUsed or {}
    data.extra_data.zonghaiUsed[player.id] = data.extra_data.zonghaiUsed[player.id] or {}
    table.insertTable(data.extra_data.zonghaiUsed[player.id], table.map(tos, Util.IdMapper))
  end,
})

zonghai:addEffect(fk.AfterDying, {
  anim_type = "offensive",
  is_delay_effect = true,
  can_trigger = function(self, event, target, player, data)
    return data.extra_data and (data.extra_data.zonghaiUsed or {})[player.id] and not player.dead and
      table.find(data.extra_data.zonghaiUsed[player.id], function(id)
        return not player.room:getPlayerById(id).dead
      end)
  end,
  on_cost = function (self, event, target, player, data)
    local room = player.room
    local targets = table.filter(data.extra_data.zonghaiUsed[player.id], function(id)
      return not room:getPlayerById(id).dead
    end)
    targets = table.map(targets, Util.Id2PlayerMapper)
    room:sortByAction(targets)
    event:setCostData(self, {tos = targets})
    return true
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    for _, p in ipairs(event:getCostData(self).tos) do
      if not p.dead then
        room:damage{
          from = player,
          to = p,
          damage = 1,
          skillName = zonghai.name,
        }
      end
    end
  end,
})

zonghai:addEffect("prohibit", {
  prohibit_use = function(self, player, card)
    return player:getMark("@@zonghai") == 0 and
      table.find(Fk:currentRoom().alive_players, function(p)
        return p:getMark("@@zonghai") ~= 0
      end)
  end,
})

return zonghai
