local tianbian = fk.CreateSkill {
  name = "tianbian",
}

Fk:loadTranslationTable{
  ["tianbian"] = "天辩",
  [":tianbian"] = "当你拼点时，你可以改为用牌堆顶的一张牌进行拼点；当你的拼点牌亮出后，若此牌花色为<font color='red'>♥</font>，则点数视为K。",

  ["#tianbian-invoke"] = "天辩：是否用牌堆顶牌拼点？",

  ["$tianbian1"] = "当今天子为刘，天亦姓刘！",
  ["$tianbian2"] = "阁下知其然，而未知其所以然。",
}

tianbian:addEffect(fk.StartPindian, {
  can_trigger = function(self, event, target, player, data)
    if player:hasSkill(tianbian.name) then
      if player == data.from then
        return not data.fromCard
      else
        return table.contains(data.tos, player) and not (data.results[player] and data.results[player].toCard)
      end
    end
  end,
  on_cost = function(self, event, target, player, data)
    return player.room:askToSkillInvoke(player, {
      skill_name = tianbian.name,
      prompt = "#tianbian-invoke"
    })
  end,
  on_use = function(self, event, target, player, data)
    if player == data.from then
      data.fromCard = Fk:getCardById(player.room:getNCards(1)[1])
    else
      data.results[player] = data.results[player] or {}
      data.results[player].toCard = Fk:getCardById(player.room:getNCards(1)[1])
    end
  end,
})

tianbian:addEffect(fk.PindianCardsDisplayed, {
  can_refresh = function(self, event, target, player, data)
    if player:hasSkill(tianbian.name) then
      if player == data.from and data.fromCard.suit == Card.Heart then
        return true
      elseif data.results[player] and data.results[player].toCard.suit == Card.Heart then
        return true
      end
    end
  end,
  on_refresh = function(self, event, target, player, data)
    player.room:changePindianNumber(data, player, 13, tianbian.name)
  end,
})

tianbian:addTest(function (room, me)
  FkTest.runInRoom(function ()
    room:handleAddLoseSkills(me, tianbian.name)
  end)
  local comp2 = room.players[2]
  local card = room:printCard("peach", Card.Heart, 1)
  local card2 = room:printCard("slash", Card.Spade, 1)
  FkTest.runInRoom(function ()
    room:obtainCard(comp2, card2)
    me:pindian({comp2}, tianbian.name, card)
  end)
  lu.assertEquals(card.number, 1)
end)

return tianbian
