local bizha = fk.CreateSkill {
  name = "bizha",
}

Fk:loadTranslationTable{
  ["bizha"] = "鄙诈",
  [":bizha"] = "结束阶段开始时，你可以摸一张牌并拼点：若对方没赢，其失去2点体力并令你观看其手牌，然后你可使用其中至多两张点数小于其拼点牌的牌；" ..
  "若你没赢，你减1点体力上限。",

  ["#bizha-choose"] = "鄙诈：你可以摸一张牌并拼点，对方没赢失去体力且你可用其手牌，你没赢减体力上限",
  ["#bizha-use"] = "鄙诈：你可以使用 %dest 手牌中一张点数小于 %arg 的牌",
}

bizha:addEffect(fk.EventPhaseStart, {
  can_trigger = function(self, event, target, player, data)
    return
      target == player and
      player.phase == Player.Finish and
      player:hasSkill(bizha.name) and
      table.find(player.room.alive_players, function(p) return player:canPindian(p, true) end)
  end,
  on_cost = function(self, event, target, player, data)
    local targets = table.filter(player.room.alive_players, function(p) return player:canPindian(p, true) end)
    if #targets == 0 then
      return false
    end

    local tos = player.room:askToChoosePlayers(
      player,
      {
        min_num = 1,
        max_num = 1,
        targets = targets,
        skill_name = bizha.name,
        prompt = "#bizha-choose",
      }
    )

    if #tos > 0 then
      event:setCostData(self, { tos = tos })
      return true
    end
  end,
  on_use = function (self, event, target, player, data)
    ---@type string
    local skillName = bizha.name
    local room = player.room
    local to = event:getCostData(self).tos[1]

    player:drawCards(1, skillName)
    if not player:canPindian(to) then
      return false
    end

    local pindian = player:pindian({ to }, skillName)
    if pindian.results[to].winner ~= to then
      room:loseHp(to, 2, skillName)
      if to:isAlive() then
        local availableIds = table.filter(to:getCardIds("h"), function(id)
          local cardNumber = Fk:getCardById(id).number
          return cardNumber > 0 and cardNumber < pindian.results[to].toCard.number
        end)

        for _ = 1, 2 do
          local use = room:askToUseRealCard(
            player,
            {
              pattern = availableIds,
              skill_name = skillName,
              prompt = "#bizha-use::" .. to.id .. ":" .. pindian.results[to].toCard.number,
              extra_data = {
                expand_pile = to:getCardIds("h")
              }
            }
          )

          if not use then
            break
          end
        end
      end
    end

    if pindian.results[to].winner ~= player then
      room:changeMaxHp(player, -1)
    end
  end,
})

return bizha
