local tuigu = fk.CreateSkill {
  name = "tuigu",
}

Fk:loadTranslationTable{
  ["tuigu"] = "蜕骨",
  [":tuigu"] = "回合开始时，你可以翻面令你本回合手牌上限+X，然后摸X张牌并视为使用一张【解甲归田】（目标角色不能使用这些装备牌直到其回合结束，"..
  "X为场上角色数的一半，向下取整）；每轮结束时，若你本轮未行动过，你执行一个额外的回合；当你失去装备区里的牌后，你回复1点体力。",

  ["#tuigu-invoke"] = "蜕骨：你可以翻面，本回合手牌上限+%arg并摸%arg张牌",
  ["#tuigu-use"] = "蜕骨：视为使用【解甲归田】（令目标收回装备区所有牌，其不能使用这些装备直到其回合结束）",
  ["@@tuigu-inhand"] = "蜕骨",

  ["$tuigu1"] = "臣老年虚乏，唯愿乞骸骨。",
  ["$tuigu2"] = "今指水为誓，若有相违，天弃之！",
  ["$tuigu3"] = "汉室世衰，天命在曹；曹氏世衰，天命归我。",
  ["$tuigu4"] = "天时已至而犹谦让，舜禹所不为也。",
  ["$tuigu5"] = "皇天眷我，神人同谋，当取此天下。",
}

tuigu:addEffect(fk.TurnStart, {
  mute = true,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    return room:askToSkillInvoke(player, {
      skill_name = tuigu.name,
      prompt = "#tuigu-invoke:::"..#room.alive_players // 2,
    })
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    player:broadcastSkillInvoke(tuigu.name, math.random(2))
    room:notifySkillInvoked(player, tuigu.name, "drawcard")
    player:turnOver()
    if player.dead then return end
    local n = #room.alive_players // 2
    room:addPlayerMark(player, MarkEnum.AddMaxCardsInTurn, n)
    room:drawCards(player, n, tuigu.name)
    if player.dead then return end
    room:askToUseVirtualCard(player, {
      name = "demobilized",
      skill_name = tuigu.name,
      prompt = "#tuigu-use",
      cancelable = false,
    })
  end,
})

tuigu:addEffect(fk.AfterCardsMove, {
  can_refresh = Util.TrueFunc,
  on_refresh = function(self, event, target, player, data)
    local room = player.room
    local cards = {}
    for _, move in ipairs(data) do
      if move.to == player and move.toArea == Card.PlayerHand and move.skillName == "demobilized_skill" then
        for _, info in ipairs(move.moveInfo) do
          if table.contains(player:getCardIds("h"), info.cardId) then
            table.insertIfNeed(cards, info.cardId)
          end
        end
      end
    end
    if #cards == 0 then return false end
    local effect = room.logic:getCurrentEvent():findParent(GameEvent.CardEffect)
    if effect then
      local cardEffectEvent = effect.data
      if table.contains(cardEffectEvent.card.skillNames, tuigu.name) then
        for _, id in ipairs(cards) do
          room:setCardMark(Fk:getCardById(id), "@@tuigu-inhand", 1)
        end
      end
    end
  end,
})

tuigu:addEffect("prohibit", {
  prohibit_use = function(self, player, card)
    local cardList = card:isVirtual() and card.subcards or {card.id}
    return table.find(cardList, function (id)
      return Fk:getCardById(id):getMark("@@tuigu-inhand") > 0
    end)
  end,
})

tuigu:addEffect(fk.TurnEnd, {
  late_refresh = true,
  can_refresh = function(self, event, target, player, data)
    return target == player
  end,
  on_refresh = function(self, event, target, player, data)
    for _, id in ipairs(player:getCardIds("h")) do
      player.room:setCardMark(Fk:getCardById(id), "@@tuigu-inhand", 0)
    end
  end,
})

tuigu:addEffect(fk.AfterCardsMove, {
  anim_type = "support",
  can_trigger = function(self, event, target, player, data)
    if player:hasSkill(tuigu.name) and player:isWounded() then
      for _, move in ipairs(data) do
        if move.from == player then
          for _, info in ipairs(move.moveInfo) do
            if info.fromArea == Card.PlayerEquip then
              return true
            end
          end
        end
      end
    end
  end,
  on_cost = Util.TrueFunc,
  on_use = function(self, event, target, player, data)
    local room = player.room
    room:recover{
      who = player,
      num = 1,
      recoverBy = player,
      skillName = tuigu.name,
    }
  end,
})

tuigu:addEffect(fk.RoundEnd, {
  mute = true,
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(tuigu.name) and
    #player.room.logic:getEventsOfScope(GameEvent.Turn, 1, function (e)
      return e.data.who == player
    end, Player.HistoryRound) == 0
  end,
  on_cost = Util.TrueFunc,
  on_use = function(self, event, target, player, data)
    local room = player.room
    player:broadcastSkillInvoke(tuigu.name, math.random(3, 5))
    room:notifySkillInvoked(player, tuigu.name, "offensive")
    player:gainAnExtraTurn(true, tuigu.name)
  end,
})

return tuigu
