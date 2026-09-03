local huoe = fk.CreateSkill {
  name = "huoe",
}

Fk:loadTranslationTable{
  ["huoe"] = "火厄",
  [":huoe"] = "结束阶段开始时，你可以视为对至多四名其他角色使用一张【火攻】，若你能执行此【火攻】效果的弃牌，" ..
  "则你须弃置牌且此【火攻】对剩余目标无效（否则当前目标观看你的手牌）。最后你分配因此【火攻】效果展示的牌，" ..
  "然后若这些牌点数和小于13则你失去1点体力。",

  ["#huoe-choose"] = "火厄：你可以对至多四名其他角色使用一张【火攻】",
}

huoe:addEffect(fk.EventPhaseStart, {
  can_trigger = function(self, event, target, player, data)
    return
      target == player and
      player.phase == Player.Finish and
      player:hasSkill(huoe.name) and
      table.find(player.room.alive_players, function(p)
        return p ~= player and player:canUseTo(Fk:cloneCard("fire_attack"), p)
      end)
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local fireAttack = Fk:cloneCard("fire_attack")
    local targets = table.filter(room.alive_players, function(p)
      return p ~= player and player:canUseTo(fireAttack, p)
    end)

    if #targets == 0 then
      return false
    end

    local tos = room:askToChoosePlayers(
      player,
      {
        min_num = 1,
        max_num = 4,
        targets = targets,
        skill_name = huoe.name,
        prompt = "#huoe-choose",
      }
    )

    if #tos > 0 then
      event:setCostData(self, { tos = tos })
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    ---@type string
    local skillName = huoe.name
    local room = player.room
    ---@type ServerPlayer[]
    local tos = event:getCostData(self).tos
    local use = room:useVirtualCard("fire_attack", nil, player, tos, skillName)

    if use and (use.extra_data or {}).huoeShowCards then
      local cards = use.extra_data.huoeShowCards
      local numberSum = 0
      table.forEach(cards, function(id)
        numberSum = numberSum + Fk:getCardById(id).number
      end)

      room:askToYiji(
        player,
        {
          min_num = #cards,
          max_num = #cards,
          cards = cards,
          skill_name = skillName,
          cancelable = false,
          expand_pile = cards,
        }
      )

      if numberSum < 13 then
        room:loseHp(player, 1, skillName)
      end
    end
  end,
})

huoe:addEffect(fk.PreCardEffect, {
  can_refresh = function(self, event, target, player, data)
    return target == player and data.card.trueName == "fire_attack" and table.contains(data.card.skillNames, huoe.name)
  end,
  on_refresh = function(self, event, target, player, data)
    data.extra_data = data.extra_data or {}
    data.extra_data.extra_effect = data.extra_data.extra_effect or {}
    table.insert(data.extra_data.extra_effect, function (room, effect, showCard, params)
      local result = table.clone(params)
      local num = #table.filter(params.expand_pile or {}, function (id)
        return Fk:getCardById(id):matchPattern(params.pattern) and not effect.from:prohibitDiscard(id)
      end) + #table.filter(effect.from:getCardIds("h"), function (id)
        return Fk:getCardById(id):matchPattern(params.pattern) and not effect.from:prohibitDiscard(id)
      end)

      local use = player.room.logic:getCurrentEvent():findParent(GameEvent.UseCard)
      if use then
        local useData = use.data
        useData.extra_data = useData.extra_data or {}
        useData.extra_data.huoeShowCards = useData.extra_data.huoeShowCards or {}
        table.insertIfNeed(useData.extra_data.huoeShowCards, showCard.id)
      end

      if num > 0 then
        if use then
          use.data.nullifiedTargets = use.data.tos
        end

        result.cancelable = false
      end
      return result
    end)
  end,
})

return huoe
