local haibian = fk.CreateSkill {
  name = "haibian",
}

Fk:loadTranslationTable{
  ["haibian"] = "骇变",
  [":haibian"] = "每名角色的回合开始时，若你于上个回合内使用过手牌，则上个回合最后一张黑色牌和红色牌的使用者依次可以视为使用一张【决斗】。",
}

haibian:addEffect(fk.TurnStart, {
  can_trigger = function(self, event, target, player, data)
    if not player:hasSkill(haibian.name) then
      return false
    end

    local room = player.room
    local turnEvents = room.logic:getEventsByRule(GameEvent.Turn, 2, Util.TrueFunc, nil, Player.HistoryGame)
    if #turnEvents < 2 then
      return false
    end

    local lastTurn = turnEvents[2]
    local handUsed = false
    local blackUser, redUser
    room.logic:getEventsByRule(
      GameEvent.UseCard,
      1,
      function(e)
        if e.id > lastTurn.end_id then
          return false
        end

        local use = e.data
        handUsed = handUsed or (use.from == player and use:isUsingHandcard(player, e))

        if not blackUser and use.card.color == Card.Black then
          blackUser = use.from
        end

        if not redUser and use.card.color == Card.Red then
          redUser = use.from
        end

        if handUsed and blackUser and redUser then
          return true
        end
      end,
      lastTurn.id
    )

    if handUsed and ((blackUser and blackUser:isAlive()) or (redUser and redUser:isAlive())) then
      event:setCostData(self, { blackUser = blackUser, redUser = redUser })
      return true
    end
  end,
  on_cost = Util.TrueFunc,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local blackUser = event:getCostData(self).blackUser
    local redUser = event:getCostData(self).redUser

    if blackUser and blackUser:isAlive() then
      room:askToUseVirtualCard(
        blackUser,
        {
          name = "duel",
          skill_name = haibian.name,
        }
      )
    end

    if redUser and redUser:isAlive() then
      room:askToUseVirtualCard(
        redUser,
        {
          name = "duel",
          skill_name = haibian.name,
        }
      )
    end
  end,
})

return haibian
