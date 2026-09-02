local youjin = fk.CreateSkill {
  name = "js__youjin",
}

Fk:loadTranslationTable{
  ["js__youjin"] = "诱进",
  [":js__youjin"] = "出牌阶段开始时，你可以与一名角色拼点，双方本回合不能使用或打出点数小于各自拼点牌的手牌，赢的角色视为对没赢的角色使用一张【杀】。",

  ["#js__youjin-choose"] = "诱进：你可以与一名角色拼点，双方不能使用打出点数小于各自拼点牌的手牌，赢者视为对输者使用【杀】",
  ["@js__youjin-turn"] = "诱进",
}

youjin:addEffect(fk.EventPhaseStart, {
  anim_type = "control",
  can_trigger = function(self, event, target, player, data)
    return player == target and player:hasSkill(youjin.name) and player.phase == Player.Play and
      table.find(player.room.alive_players, function (p)
        return player:canPindian(p)
      end)
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local targets = table.filter(room.alive_players, function (p)
      return player:canPindian(p)
    end)
    local to = room:askToChoosePlayers(player, {
      targets = targets,
      min_num = 1,
      max_num = 1,
      prompt = "#js__youjin-choose",
      skill_name = youjin.name,
      cancelable = true,
    })
    if #to > 0 then
      event:setCostData(self, {tos = to})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local to = event:getCostData(self).tos[1]
    local pindian = player:pindian({to}, youjin.name)
    local fromNum = pindian.fromCard.number
    if fromNum > 0 and not player.dead then
      fromNum = math.max(fromNum, player:getMark("@js__youjin-turn"))
      room:setPlayerMark(player, "@js__youjin-turn", fromNum)
    end
    local toNum = pindian.results[to].toCard.number
    if toNum > 0 and not to.dead then
      fromNum = math.max(toNum, to:getMark("@js__youjin-turn"))
      room:setPlayerMark(to, "@js__youjin-turn", toNum)
    end
    local winner = pindian.results[to].winner
    if winner and not winner.dead then
      local loser = (winner == player) and to or player
      if not loser.dead then
        room:useVirtualCard("slash", nil, winner, loser, youjin.name, true)
      end
    end
  end,
})

youjin:addEffect("prohibit", {
  prohibit_use = function(self, player, card)
    if player:getMark("@js__youjin-turn") > 0 and card and card.number > 0 and card.number < player:getMark("@js__youjin-turn") then
      local cards = card:isVirtual() and card.subcards or {card.id}
      return #cards > 0 and table.every(cards, function(id)
        return table.contains(player:getCardIds("h"), id)
      end)
    end
  end,
  prohibit_response = function(self, player, card)
    if player:getMark("@js__youjin-turn") > 0 and card and card.number > 0 and card.number < player:getMark("@js__youjin-turn") then
      local cards = card:isVirtual() and card.subcards or {card.id}
      return #cards > 0 and table.every(cards, function(id)
        return table.contains(player:getCardIds("h"), id)
      end)
    end
  end,
})

return youjin
