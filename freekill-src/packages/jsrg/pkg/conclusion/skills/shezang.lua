local shezang = fk.CreateSkill {
  name = "js__shezang",
}

Fk:loadTranslationTable{
  ["js__shezang"] = "奢葬",
  [":js__shezang"] = "每轮限一次，当你进入濒死状态时，或一名角色于你的回合内进入濒死状态时，你可以亮出牌堆顶四张牌，获得其中任意张花色各不相同的牌。",

  ["#js__shezang-prey"] = "奢葬：获得其中任意张花色各不相同的牌",

  ["$js__shezang1"] = "陛下以金玉饰思我之情，何不与我共长眠之？",
  ["$js__shezang2"] = "九幽泉下黄金墓，黄金墓里断肠人。",
}

Fk:addPoxiMethod{
  name = "js__shezang",
  prompt = "#js__shezang-prey",
  card_filter = function(to_select, selected, data)
    if #selected == 0 then
      return Fk:getCardById(to_select).suit ~= Card.NoSuit
    else
      return table.every(selected, function (id)
        return Fk:getCardById(to_select):compareSuitWith(Fk:getCardById(id), true)
      end)
    end
  end,
  feasible = function(selected)
    return #selected > 0
  end,
  default_choice = function (data, extra_data)
    return {data[1][2][1]}
  end,
}

shezang:addEffect(fk.EnterDying, {
  anim_type = "drawcard",
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(shezang.name) and
      (target == player or player.room.current == player) and
      player:usedSkillTimes(shezang.name, Player.HistoryRound) == 0
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local cards = room:getNCards(4)
    room:turnOverCardsFromDrawPile(player, cards, shezang.name)
    local result = room:askToPoxi(player, {
      poxi_type = shezang.name,
      data = {
        { shezang.name, cards },
      },
      cancelable = false,
    })
    if #result > 0 then
      room:moveCardTo(result, Card.PlayerHand, player, fk.ReasonJustMove, shezang.name, nil, false, player)
    end
    room:cleanProcessingArea(cards)
  end,
})

return shezang
