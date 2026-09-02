local poxi = fk.CreateSkill {
  name = "poxi",
}

Fk:loadTranslationTable{
  ["poxi"] = "魄袭",
  [":poxi"] = "出牌阶段限一次，你可以观看一名其他角色的手牌，然后你可以弃置你与其手里共计四张不同花色的牌。若如此做，根据此次弃置你的牌数量"..
  "执行以下效果：没有，体力上限减1；一张，结束出牌阶段且本回合手牌上限-1；三张，回复1点体力；四张，摸四张牌。",

  ["poxi_discard"] = "魄袭",
  ["#poxi"] = "魄袭：选择一名有手牌的其他角色，并可弃置你与其手牌中共计四张花色各不相同的牌",
  ["#poxi-ask"] = "魄袭：弃置双方手里四张不同花色的牌",

  ["$poxi1"] = "夜袭敌军，挫其锐气。",
  ["$poxi2"] = "受主知遇，袭敌不惧。",
}

Fk:addPoxiMethod{
  name = "poxi_discard",
  prompt = "#poxi-ask",
  card_filter = function(to_select, selected, data)
    local suit = Fk:getCardById(to_select).suit
    if suit == Card.NoSuit then return false end
    return not table.find(selected, function(id) return Fk:getCardById(id).suit == suit end)
    and not (Self:prohibitDiscard(Fk:getCardById(to_select)) and table.contains(data[1][2], to_select))
  end,
  feasible = function(selected)
    return #selected == 4
  end,
}
poxi:addEffect("active", {
  anim_type = "control",
  prompt = "#poxi",
  card_num = 0,
  target_num = 1,
  can_use = function(self, player)
    return player:usedSkillTimes(poxi.name, Player.HistoryPhase) < 1
  end,
  card_filter = Util.FalseFunc,
  target_filter = function(self, player, to_select, selected)
    return #selected == 0 and to_select ~= player and not to_select:isKongcheng()
  end,
  on_use = function(self, room, effect)
    local player = effect.from
    local target = effect.tos[1]
    local player_hands = player:getCardIds("h")
    local target_hands = target:getCardIds("h")
    local cards = room:askToPoxi(player, {
      poxi_type = "poxi_discard",
      data = {
        { player.general, player_hands },
        { target.general, target_hands },
      },
      cancelable = true,
    })
    if #cards == 0 then return end
    local cards1 = table.filter(cards, function(id) return table.contains(player_hands, id) end)
    local cards2 = table.filter(cards, function(id) return table.contains(target_hands, id) end)
    local moveInfos = {}
    if #cards1 > 0 then
      table.insert(moveInfos, {
        from = player.id,
        ids = cards1,
        toArea = Card.DiscardPile,
        moveReason = fk.ReasonDiscard,
        proposer = effect.from,
        skillName = poxi.name,
      })
    end
    if #cards2 > 0 then
      table.insert(moveInfos, {
        from = target.id,
        ids = cards2,
        toArea = Card.DiscardPile,
        moveReason = fk.ReasonDiscard,
        proposer = effect.from,
        skillName = poxi.name,
      })
    end
    room:moveCards(table.unpack(moveInfos))
    if player.dead then return end

    if #cards1 == 0 then
      room:changeMaxHp(player, -1)
    elseif #cards1 == 3 and player:isWounded() then
      room:recover({
        who = player,
        num = 1,
        recoverBy = player,
        skillName = poxi.name
      })
    elseif #cards1 == 1 then
      room:addPlayerMark(player, MarkEnum.MinusMaxCardsInTurn)
      player:endPlayPhase()
    elseif #cards1 == 4 then
      room:drawCards(player, 4, poxi.name)
    end
  end,
})

return poxi
