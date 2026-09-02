local tuwei = fk.CreateSkill {
  name = "tuwei",
  tags = { Skill.AttachedKingdom },
  attached_kingdom = {"wei"},
}

Fk:loadTranslationTable{
  ["tuwei"] = "突围",
  [":tuwei"] = "魏势力技，出牌阶段开始时，你可以获得攻击范围内任意名角色各一张牌；回合结束时，这些角色中本回合未成为过牌的目标的角色各获得你的一张牌。",

  ["#tuwei-choose"] = "突围：你可以获得攻击范围内任意名角色各一张牌",
}

tuwei:addEffect(fk.EventPhaseStart, {
  anim_type = "control",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(tuwei.name) and player.phase == Player.Play and
      table.find(player.room.alive_players, function(p)
        return player:inMyAttackRange(p) and not p:isNude()
      end)
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local targets = table.filter(room.alive_players, function(p)
      return player:inMyAttackRange(p) and not p:isNude()
    end)
    local tos = room:askToChoosePlayers(player, {
      targets = targets,
      min_num = 1,
      max_num = #targets,
      prompt = "#tuwei-choose",
      skill_name = tuwei.name,
    })
    if #tos > 0 then
      room:sortByAction(tos)
      event:setCostData(self, {tos = tos})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local mark = player:getTableMark("tuwei-turn")
    for _, p in ipairs(event:getCostData(self).tos) do
      if not p.dead and not p:isNude() then
        table.insertIfNeed(mark, p.id)
        local card = room:askToChooseCard(player, {
          target = p,
          flag = "he",
          skill_name = tuwei.name
        })
        room:moveCardTo(card, Card.PlayerHand, player, fk.ReasonPrey, tuwei.name, nil, false, player)
      end
      if player.dead then return end
    end
    room:setPlayerMark(player, "tuwei-turn", mark)
  end,
})

tuwei:addEffect(fk.TurnEnd, {
  anim_type = "negative",
  is_delay_effect = true,
  can_trigger = function(self, event, target, player, data)
    if target == player and player:getMark("tuwei-turn") ~= 0 and not player:isNude() then
      local tos = player:getMark("tuwei-turn")
      player.room.logic:getEventsOfScope(GameEvent.UseCard, 1, function(e)
        for _, p in ipairs(e.data.tos) do
          table.removeOne(tos, p.id)
        end
      end, Player.HistoryTurn)
      tos = table.map(tos, Util.Id2PlayerMapper)
      tos = table.filter(tos, function (p)
        return not p.dead
      end)
      if #tos > 0 then
        player.room:sortByAction(tos)
        event:setCostData(self, {tos = tos})
        return true
      end
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local tos = event:getCostData(self).tos
    for _, p in ipairs(tos) do
      if player.dead or player:isNude() then return end
      if not p.dead then
        local card = room:askToChooseCard(p, {
          target = player,
          flag = "he",
          skill_name = tuwei.name,
        })
        room:moveCardTo(card, Card.PlayerHand, p, fk.ReasonPrey, tuwei.name, nil, false, p)
      end
    end
  end,
})

return tuwei
