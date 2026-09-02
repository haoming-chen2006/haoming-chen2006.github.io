local skill = fk.CreateSkill {
  name = "role__wooden_ox_skill&",
  attached_equip = "role__wooden_ox",
}

skill:addEffect("active", {
  prompt = "#role__wooden_ox",
  can_use = function(self, player)
    return player:usedSkillTimes(skill.name, Player.HistoryPhase) == 0 and #player:getPile("$role_carriage") < 5
  end,
  card_num = 1,
  card_filter = function(self, player, to_select, selected)
    return #selected == 0 and table.contains(player:getCardIds("h"), to_select)
  end,
  target_num = 0,
  on_use = function(self, room, effect)
    local player = effect.from
    player:addToPile("$role_carriage", effect.cards[1], false, skill.name)
    if player.dead then return end
    local ox = table.find(player:getCardIds("e"), function(id)
      return (player:getVirtualEquip(id) or Fk:getCardById(id)).name == "role__wooden_ox"
    end)
    if ox then
      local targets = table.filter(room.alive_players, function(p)
        return p ~= player and p:hasEmptyEquipSlot(Card.SubtypeTreasure) end)
      if #targets > 0 then
        local to = room:askToChoosePlayers(player, {
          targets = targets,
          min_num = 1,
          max_num = 1,
          prompt = "#role__wooden_ox-move",
          skill_name = skill.name,
          cancelable = true,
        })
        if #to > 0 then
          room:moveCardTo(ox, Card.PlayerEquip, to[1], fk.ReasonPut, skill.name, nil, true, player)
        end
      end
    end
  end,
})
skill:addEffect(fk.AfterCardsMove, {
  mute = true,
  is_delay_effect = true,
  priority = 5,
  can_trigger = function(self, event, target, player, data)
    if player:getPile("$role_carriage") == 0 then return false end
    local skip = true
    for _, move in ipairs(data) do
      for _, info in ipairs(move.moveInfo) do
        if info.fromArea == Card.Processing then
          skip = false
        end
        if info.beforeCard.name == "role__wooden_ox" then
          if move.moveReason == fk.ReasonExchange then
            if move.from == player and info.fromArea == Card.PlayerEquip and move.toArea ~= Card.Processing then
              --适用于被修改了移动区域的情况，如销毁，虽然说原则上移至处理区是不应销毁的
              event:setCostData(self, nil)
              return true
            end
          elseif move.from == player and info.fromArea == Card.PlayerEquip then
            if move.toArea == Card.PlayerEquip and
              (info.virtualEquip == nil or info.virtualEquip.name == "role__wooden_ox") then
              if move.to ~= player then
                event:setCostData(self, { extra_data = move.to })
                return true
              end
            else
              event:setCostData(self, nil)
              return true
            end
          end
        end
      end
    end
    if skip then return false end

    local room = player.room
    --注意到一次交换事件的过程中的两次移动事件都是在一个parent事件里进行的，因此查询到parent事件为止即可
    local move_event = room.logic:getCurrentEvent():findParent(GameEvent.MoveCards, true)
    if not move_event then return end
    local parent_event = move_event.parent
    local move_events = room.logic:getEventsByRule(GameEvent.MoveCards, 1, function (e)
      if e.id >= move_event.id or e.parent ~= parent_event then return false end
      for _, last_move in ipairs(e.data) do
        if last_move.moveReason == fk.ReasonExchange and last_move.toArea == Card.Processing then
          return true
        end
      end
    end, parent_event.id)
    if #move_events > 0 then
      for _, last_move in ipairs(move_events[1].data) do
        if last_move.moveReason == fk.ReasonExchange then
          for _, last_info in ipairs(last_move.moveInfo) do
            if last_info.beforeCard.name == "role__wooden_ox" and
              last_move.from == player and last_info.fromArea == Card.PlayerEquip then
              for _, move in ipairs(data) do
                for _, info in ipairs(move.moveInfo) do
                  if info.cardId == last_info.cardId and info.fromArea == Card.Processing then
                    if move.toArea == Card.PlayerEquip and
                      (info.virtualEquip == nil or info.virtualEquip.name == "role__wooden_ox") then
                      if move.to ~= player then
                        event:setCostData(self, { extra_data = move.to })
                        return true
                      end
                    else
                      event:setCostData(self, nil)
                      return true
                    end
                  end
                end
              end
              --多个木马同时移动的情况取其中之一即可，不再做冗余判断
              return false
            end
          end
        end
      end
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local cards = player:getPile("$role_carriage")
    if event:getCostData(self) ~= nil then
      event:getCostData(self).extra_data:addToPile("$role_carriage", cards, false, skill.name)
    else
      room:moveCardTo(cards, Card.DiscardPile, nil, fk.ReasonPutIntoDiscardPile, skill.name, nil, true)
    end
  end
})

skill:addEffect("filter", {
  handly_cards = function (self, player)
    if player:hasSkill(skill.name) then
      return player:getPile("$role_carriage")
    end
  end,
})

skill:addEffect("prohibit", {
  prohibit_use = function (self, player, card)
    if not player:hasSkill(skill.name) then return false end
    local ids = Card:getIdList(card)
    if #ids < 2 then return false end
    return table.find(ids, function (id)
      return Fk:getCardById(id).name == "role__wooden_ox" and Fk:currentRoom():getCardArea(id) == Card.PlayerEquip
    end) and table.find(ids, function (id)
      return player:getPileNameOfId(id) == "$role_carriage"
    end)
  end,
  prohibit_response = function (self, player, card)
    if not player:hasSkill(skill.name) then return false end
    local ids = Card:getIdList(card)
    if #ids < 2 then return false end
    return table.find(ids, function (id)
      return Fk:getCardById(id).name == "role__wooden_ox" and Fk:currentRoom():getCardArea(id) == Card.PlayerEquip
    end) and table.find(ids, function (id)
      return player:getPileNameOfId(id) == "$role_carriage"
    end)
  end,
})

return skill
