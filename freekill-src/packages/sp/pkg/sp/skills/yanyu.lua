local yanyu = fk.CreateSkill {
  name = "sp__yanyu",
}

Fk:loadTranslationTable {
  ["sp__yanyu"] = "燕语",
  [":sp__yanyu"] = "一名角色的出牌阶段开始时，你可以弃置一张牌，若如此做，当本阶段有与你弃置牌类别相同的其他牌进入弃牌堆时，"..
  "你可以令任意一名角色获得此牌。每回合以此法获得的牌不能超过三张。",

  ["#sp__yanyu-ask"] = "燕语：你可以弃置一张牌，然后此出牌阶段限三次，可令任意角色获得相同类别进入弃牌堆的牌",
  ["@sp__yanyu-phase"] = "燕语",
  ["#sp__yanyu-give"] = "燕语：你可以令一名角色获得弃置的牌",

  ["$sp__yanyu1"] = "燕燕于飞，颉之颃之。",
  ["$sp__yanyu2"] = "终温且惠，淑慎其身。",
}

yanyu:addEffect(fk.EventPhaseStart, {
  anim_type = "support",
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(yanyu.name) and target.phase == Player.Play and not player:isNude()
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local card = room:askToDiscard(player, {
      min_num = 1,
      max_num = 1,
      include_equip = true,
      prompt = "#sp__yanyu-ask",
      skill_name = yanyu.name,
      skip = true,
    })
    if #card > 0 then
      event:setCostData(self, {cards = card})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local id = event:getCostData(self).cards[1]
    local type = Fk:getCardById(id):getTypeString()
    room:throwCard(id, yanyu.name, player, player)
    if player.dead then return end
    local x = 3 - player:usedEffectTimes("#yanyu_2_trig", Player.HistoryTurn)
    if not player.dead and x > 0 then
      room:setPlayerMark(player, "@sp__yanyu-phase", { type, x })
    end
  end,
})

yanyu:addEffect(fk.AfterCardsMove, {
  anim_type = "support",
  can_trigger = function(self, event, target, player, data)
    if player:getMark("@sp__yanyu-phase") ~= 0 and not player.dead then
      local type = player:getMark("@sp__yanyu-phase")[1]
      local ids = {}
      for _, move in ipairs(data) do
        if move.toArea == Card.DiscardPile then
          for _, info in ipairs(move.moveInfo) do
            if Fk:getCardById(info.cardId):getTypeString() == type and
              table.contains(player.room.discard_pile, info.cardId) then
              table.insertIfNeed(ids, info.cardId)
            end
          end
        end
      end
      ids = player.room.logic:moveCardsHoldingAreaCheck(ids)
      if #ids > 0 then
        event:setCostData(self, {cards = ids})
        return true
      end
    end
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local cards = event:getCostData(self).cards
    local tos, ids = room:askToChooseCardsAndPlayers(player, {
      min_card_num = 1,
      max_card_num = player:getMark("@sp__yanyu-phase")[2],
      pattern = tostring(Exppattern { id = cards }),
      targets = room:getAlivePlayers(false),
      skill_name = yanyu.name,
      min_num = 1,
      max_num = 1,
      prompt = "#sp__yanyu-give",
      cancelable = true,
      expand_pile = cards,
    })

    if #tos > 0 and #ids > 0 then
      event:setCostData(self, { tos = tos, cards = ids })
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local mark = player:getMark("@sp__yanyu-phase")
    local costData = event:getCostData(self)

    mark[2] = mark[2] - #costData.cards
    if mark[2] == 0 then
      room:setPlayerMark(player, "@sp__yanyu-phase", 0)
    else
      room:setPlayerMark(player, "@sp__yanyu-phase", mark)
    end
    room:obtainCard(costData.tos[1], costData.cards, true, fk.ReasonPrey, player, yanyu.name)
  end,
})

return yanyu
