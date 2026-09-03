local qianliu = fk.CreateSkill {
  name = "qianliu",
}

Fk:loadTranslationTable {
  ["qianliu"] = "潜流",
  [":qianliu"] = "与你距离1以内的角色成为【杀】的目标后，你可以观看牌堆底四张牌，以任意顺序置于牌堆顶或牌堆底；若花色各不相同，" ..
      "你可以展示并获得这些牌。",

  ["#qianliu-prey"] = "潜流：你可以展示并获得这些牌",
}

qianliu:addEffect(fk.TargetConfirmed, {
  anim_type = "control",
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(qianliu.name) and data.card.trueName == "slash" and
        target:distanceTo(player) <= 1
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    --room:askToGuanxing(player, {cards = room:getNCards(4, "bottom")})
    local cards = room:getNCards(4, "bottom")

    local result = room:askToArrangeCards(player, {
      skill_name = qianliu.name,
      card_map = {
        {}, cards, "Top", "Bottom" },
      box_size = 4,
      max_limit = { 4, 4 },
      min_limit = { 0, 0 },
      free_arrange = true,
    })

    local top, bottom
    top = result[1]
    bottom = result[2]

    local moveInfos = {}
    if #top > 0 then
      table.insert(moveInfos, { ---@type CardsMoveInfo
        ids = table.reverse(top),
        toArea = Card.DrawPile,
        moveReason = fk.ReasonPut,
        proposer = player,
        skillName = qianliu.name,
        moveVisible = false,
        visiblePlayers = player
      })
    end
    if #bottom > 0 then
      table.insert(moveInfos, { ---@type CardsMoveInfo
        ids = bottom,
        toArea = Card.DrawPile,
        moveReason = fk.ReasonPut,
        proposer = player,
        skillName = qianliu.name,
        drawPilePosition = -1,
        moveVisible = false,
        visiblePlayers = player,
      })
    end
    room:moveCards(table.unpack(moveInfos))


    if not table.find(cards, function(id)
          return table.find(cards, function(id2)
            return id ~= id2 and Fk:getCardById(id):compareSuitWith(Fk:getCardById(id2))
          end) ~= nil
        end) and
        room:askToSkillInvoke(player, {
          skill_name = qianliu.name,
          prompt = "#qianliu-prey",
        }) then
      room:showCards(cards)
      room:moveCardTo(cards, Card.PlayerHand, player, fk.ReasonJustMove, qianliu.name, nil, true, player)
      return
    end
  end,
})

return qianliu
