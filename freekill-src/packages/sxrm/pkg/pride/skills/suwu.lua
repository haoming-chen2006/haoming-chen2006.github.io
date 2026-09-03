local suwu = fk.CreateSkill {
  name = "suwu",
}

Fk:loadTranslationTable{
  ["suwu"] = "肃伍",
  [":suwu"] = "准备阶段开始时，你可以<a href='#ConnectCards'>连接</a>至多四名角色各一张手牌；若你有连接牌，" ..
  "则有连接牌的角色每回合首次使用的伤害类牌不可被响应且结算后其摸两张牌。",

  ["#suwu-choose"] = "肃伍：你可以连接至多四名角色各一张手牌",
}

local U = require "packages.utility.utility"

suwu:addEffect(fk.EventPhaseStart, {
  can_trigger = function(self, event, target, player, data)
    return
      target == player and
      player.phase == Player.Start and
      player:hasSkill(suwu.name) and
      table.find(player.room.alive_players, function(p) return not p:isKongcheng() end)
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local targets = table.filter(room.alive_players, function(p) return not p:isKongcheng() end)
    if #targets == 0 then
      return false
    end

    local tos = room:askToChoosePlayers(
      player,
      {
        min_num = 1,
        max_num = 4,
        targets = targets,
        skill_name = suwu.name,
        prompt = "#suwu-choose",
      }
    )

    if #tos > 0 then
      event:setCostData(self, { tos = tos })
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    ---@type ServerPlayer[]
    local tos = event:getCostData(self).tos

    room:sortByAction(tos)
    for _, p in ipairs(tos) do
      if p:isAlive() and not p:isKongcheng() then
        local id = room:askToChooseCard(
          player,
          {
            target = p,
            flag = "h",
            skill_name = suwu.name,
          }
        )

        U.connectCards(room, id)
      end
    end
  end,
})

suwu:addEffect(fk.PreCardUse, {
  can_refresh = function(self, event, target, player, data)
    if
      not (
        player:hasSkill(suwu.name) and
        table.find(player:getCardIds("h"), function(id) return U.isConnectedCard(id) end) and
        table.find(target:getCardIds("h"), function(id) return U.isConnectedCard(id) end)
      )
    then
      return false
    end

    local room = player.room
    local currentEvent = room.logic:getCurrentEvent()
    if target:getMark("suwu_triggered-turn") == currentEvent.id then
      return true
    end

    room.logic:getEventsOfScope(
      GameEvent.UseCard,
      1,
      function(e)
        local use = e.data
        if use.from == target and use.card.is_damage_card then
          room:setPlayerMark(target, "suwu_triggered-turn", e.id)
          return true
        end
      end,
      Player.HistoryTurn
    )

    return target:getMark("suwu_triggered-turn") == currentEvent.id
  end,
  on_refresh = function(self, event, target, player, data)
    data.disresponsiveList = player.room:getAllPlayers(false)
    data.extra_data = data.extra_data or {}
    data.extra_data.suwuUser = target
  end,
})

suwu:addEffect(fk.CardUseFinished, {
  mute = true,
  is_delay_effect = true,
  can_trigger = function(self, event, target, player, data)
    return (data.extra_data or {}).suwuUser == player
  end,
  on_use = function(self, event, target, player, data)
    player:drawCards(2, suwu.name)
  end,
})

return suwu
