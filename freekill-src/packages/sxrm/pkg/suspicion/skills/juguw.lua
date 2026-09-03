local juguw = fk.CreateSkill({
  name = "juguw",
})

Fk:loadTranslationTable{
  ["juguw"] = "聚谷",
  [":juguw"] = "准备阶段，你可以依次将任意名角色共计至多五张牌置于牌堆顶（正面朝上），此回合结束时，这些角色获得牌堆中各自放置的牌（没有则跳过），"..
  "然后各摸一张牌。",

  ["#juguw-choose"] = "聚谷：将任意名角色的牌正面朝上置于牌堆顶，回合结束时这些角色摸牌（还剩%arg张）",
}

juguw:addEffect(fk.EventPhaseStart, {
  anim_type = "support",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(juguw.name) and player.phase == Player.Start and
      table.find(player.room.alive_players, function (p)
        return not p:isNude()
      end)
  end,
  on_cost = function (self, event, target, player, data)
    local room = player.room
    local targets = table.filter(room.alive_players, function (p)
      return not p:isNude()
    end)
    local to = room:askToChoosePlayers(player, {
      min_num = 1,
      max_num = 1,
      targets = targets,
      skill_name = juguw.name,
      prompt = "#juguw-choose:::5",
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
    local total, players = 5, {}
    local cards = room:askToChooseCards(player, {
      target = to,
      min = 1,
      max = 1,
      flag = "he",
      skill_name = juguw.name,
    })
    total = total - #cards
    table.insert(players, to.id)
    room:moveCards({
      ids = cards,
      from = to,
      toArea = Card.DrawPile,
      moveReason = fk.ReasonPut,
      skillName = juguw.name,
      moveVisible = true,
      drawPilePosition = 1,
      moveMark = {"juguw-turn", to.id},
    })
    while total > 0 and not player.dead do
    local targets = table.filter(room.alive_players, function (p)
      return not p:isNude()
    end)
      if #targets == 0 then break end
      to = room:askToChoosePlayers(player, {
        min_num = 1,
        max_num = 1,
        targets = targets,
        skill_name = juguw.name,
        prompt = "#juguw-choose:::"..total,
        cancelable = true,
      })
      if #to > 0 then
        to = to[1]
        cards = room:askToChooseCards(player, {
          target = to,
          min = 1,
          max = 1,
          flag = "he",
          skill_name = juguw.name,
        })
        total = total - #cards
        table.insertIfNeed(players, to.id)
        room:moveCards({
          ids = cards,
          from = to,
          toArea = Card.DrawPile,
          moveReason = fk.ReasonPut,
          skillName = juguw.name,
          moveVisible = true,
          drawPilePosition = 1,
          moveMark = {"juguw-turn", to.id},
        })
      else
        break
      end
    end
    local record = room:getBanner("juguw-turn") or {}
    table.insert(record, players)
    room:setBanner("juguw-turn", record)
  end,
})

juguw:addEffect(fk.TurnEnd, {
  anim_type = "support",
  is_delay_effect = true,
  can_trigger = function (self, event, target, player, data)
    return target == player and player.room:getBanner("juguw-turn")
  end,
  on_use = function (self, event, target, player, data)
    local room = player.room
    local record = room:getBanner("juguw-turn")
    for _, info in ipairs(record) do
      info = table.map(info, Util.Id2PlayerMapper)
      room:sortByAction(info)
      for _, p in ipairs(info) do
        if not p.dead then
          local ids = table.filter(room.draw_pile, function (id)
            return Fk:getCardById(id):getMark("juguw-turn") == p.id
          end)
          if #ids > 0 then
            room:moveCardTo(ids, Card.PlayerHand, p, fk.ReasonJustMove, juguw.name, nil, true)
          end
        end
      end
      for _, p in ipairs(info) do
        if not p.dead then
          p:drawCards(1, juguw.name)
        end
      end
    end
  end,
})

juguw:addEffect(fk.AfterCardsMove, {
  can_refresh = function (self, event, target, player, data)
    return player.room:getBanner("juguw-turn") and player.seat == 1
  end,
  on_refresh = function (self, event, target, player, data)
    for _, move in ipairs(data) do
      if move.toArea ~= Card.DrawPile then
        for _, info in ipairs(move.moveInfo) do
          if info.fromArea == Card.DrawPile then
            player.room:setCardMark(Fk:getCardById(info.cardId), "juguw-turn", 0)
          end
        end
      end
    end
  end,
})

juguw:addEffect("visibility", {
  card_visible = function (self, player, card)
    if card:getMark("juguw-turn") ~= 0 then
      return true
    end
  end,
})

return juguw
