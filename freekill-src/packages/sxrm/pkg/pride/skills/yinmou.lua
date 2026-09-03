local yinmou = fk.CreateSkill {
  name = "yinmou",
}

Fk:loadTranslationTable{
  ["yinmou"] = "姻谋",
  [":yinmou"] = "男性角色的结束阶段开始时，其可以<a href='#ConnectCards'>连接</a>你和其各一张未被连接的手牌；当你每回合首次失去连接牌后，" ..
  "本次一同失去连接牌的角色依次摸X张牌（X为这些角色数且至多为5）。",

  ["#yinmou-invoke"] = "姻谋：你可以连接你与 %dest 各一张未被连接的手牌",
  ["#yinmou_from"] = "姻谋：请选择你的一张手牌连接",
  ["#yinmou_to"] = "姻谋：请选择 %dest 的一张手牌连接",
}

local U = require "packages.utility.utility"

yinmou:addEffect(fk.EventPhaseStart, {
  can_trigger = function(self, event, target, player, data)
    return
      target:isMale() and
      target.phase == Player.Finish and
      player:hasSkill(yinmou.name) and
      table.find(target:getCardIds("h"), function(id) return not U.isConnectedCard(id) end) and
      table.find(player:getCardIds("h"), function(id) return not U.isConnectedCard(id) end)
  end,
  on_cost = function(self, event, target, player, data)
    if player.room:askToSkillInvoke(target, { skill_name = yinmou.name, prompt = "#yinmou-invoke::" .. player.id }) then
      event:setCostData(self, { tos = { player } })
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    ---@type string
    local skillName = yinmou.name
    local room = player.room

    local fromCards = table.filter(target:getCardIds("h"), function(id) return not U.isConnectedCard(id) end)
    if #fromCards > 0 then
      local id = room:askToChooseCard(
        target,
        {
          flag = { card_data = { { "$Hand", fromCards } } },
          skill_name = skillName,
          target = target,
          prompt = "#yinmou_from",
        }
      )

      U.connectCards(room, id)
    end

    local toCards = table.filter(player:getCardIds("h"), function(id) return not U.isConnectedCard(id) end)
    if #toCards > 0 then
      local visibleData = {}
      for _, id in ipairs(toCards) do
        if not target:cardVisible(id) then
          visibleData[tostring(id)] = false
        end
      end
      local id = room:askToPoxi(
        target,
        {
          poxi_type = "AskForCardsChosen",
          data = { { "$Hand", toCards } },
          extra_data = {
            to = player.id,
            min = 1,
            max = 1,
            skillName = skillName,
            prompt = "#yinmou_to::" .. player.id,
            visible_data = visibleData,
          },
          cancelable = false,
        }
      )[1]

      if id == -1 then
        id = room:tableRandomPick(table.filter(toCards, function(cardId) return cardId == -1 end))
      end

      U.connectCards(room, id)
    end
  end,
})

yinmou:addEffect(fk.AfterSkillEffect, {
  can_trigger = function(self, event, target, player, data)
    if
      not (
        data.skill:getSkeleton().name == "#connected_cards_rule" and
        player:hasSkill(yinmou.name) and
        player:usedEffectTimes("#yinmou_2_trig") + player:usedEffectTimes("#yinmou_3_trig") == 0
      ) then
      return false
    end

    local room = player.room
    local moveEvent = room.logic:getCurrentEvent():findParent(GameEvent.MoveCards)
    if not moveEvent then
      return false
    end

    if
      table.find(moveEvent.data, function(move)
        return
          move.from == player and
          not not table.find(move.moveInfo, function(info)
            return (info.extra_data or {}).isConnectedCard
          end)
      end) or
      #room.logic:getEventsByRule(
        GameEvent.MoveCards,
        1,
        function(e)
          local moveData = e.data
          return not not table.find(moveData, function(move)
            return move.skillName == "#connected_cards_rule" and move.from == player
          end)
        end,
        room.logic:getCurrentEvent().id
      ) > 0
    then
      event:setCostData(self, { effectEvent = room.logic:getCurrentEvent() })
      return true
    end
  end,
  on_cost = Util.TrueFunc,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local effectEvent = event:getCostData(self).effectEvent
    local moveEvents = {}

    local moveEvent = effectEvent:findParent(GameEvent.MoveCards)
    if
      moveEvent and
      table.find(moveEvent.data, function(move)
        return
          move.from ~= nil and
          table.find(move.moveInfo, function(info)
            return (info.extra_data or {}).isConnectedCard
          end)
      end)
    then
      table.insert(moveEvents, moveEvent)
    end

    local events = room.logic:getEventsByRule(
      GameEvent.MoveCards,
      999,
      function(e)
        local moveData = e.data
        return not not table.find(moveData, function(move)
          return move.skillName == "#connected_cards_rule" and move.from ~= nil
        end)
      end,
      effectEvent.id
    )

    table.insertTable(moveEvents, events)

    local targets = {}
    for _, mEvent in ipairs(moveEvents) do
      local moveData = mEvent.data
      for _, move in ipairs(moveData) do
        if move.from then
          table.insertIfNeed(targets, move.from)
        end
      end
    end

    room:sortByAction(targets)
    for _, p in ipairs(targets) do
      if p:isAlive() then
        p:drawCards(math.min(5, #targets), yinmou.name)
      end
    end
  end,
})

yinmou:addEffect(fk.AfterCardsMove, {
  can_trigger = function(self, event, target, player, data)
    if
      not (
        player:hasSkill(yinmou.name) and
        player:usedEffectTimes("#yinmou_2_trig") + player:usedEffectTimes("#yinmou_3_trig") == 0
      ) then
      return false
    end

    return table.find(data, function(move)
      return
        move.from == player and
        not table.contains({ fk.ReasonUse, fk.ReasonResponse, fk.ReasonDiscard }, move.moveReason) and
        not not table.find(move.moveInfo, function(info)
          return (info.extra_data or {}).isConnectedCard and info.fromArea == Card.PlayerHand
        end)
    end)
  end,
  on_cost = Util.TrueFunc,
  on_use = function(self, event, target, player, data)
    player:drawCards(1, yinmou.name)
  end,
})

return yinmou
