local jianlou = fk.CreateSkill{
  name = "jianlou",
}

Fk:loadTranslationTable{
  ["jianlou"] = "舰楼",
  [":jianlou"] = "每回合限一次，当一张装备牌进入弃牌堆后，你可以弃置一张牌并获得之，然后若你对应装备栏没有装备，你使用之。",

  ["#jianlou1-invoke"] = "舰楼：%arg进入弃牌堆，是否弃置一张牌获得之？",
  ["#jianlou2-invoke"] = "舰楼：装备牌进入弃牌堆，是否弃置一张牌获得之？",
  ["#jianlou-prey"] = "舰楼：选择你要获得的装备牌",
  ["#jianlou-use"] = "舰楼：请使用%arg",
}

jianlou:addEffect(fk.AfterCardsMove, {
  anim_type = "drawcard",
  can_trigger = function(self, event, target, player, data)
    if player:hasSkill(jianlou.name) and player:usedSkillTimes(jianlou.name, Player.HistoryTurn) == 0 and not player:isNude() then
      local cards = {}
      for _, move in ipairs(data) do
        if move.toArea == Card.DiscardPile then
          for _, info in ipairs(move.moveInfo) do
            if Fk:getCardById(info.cardId).type == Card.TypeEquip and table.contains(player.room.discard_pile, info.cardId) then
              table.insertIfNeed(cards, info.cardId)
            end
          end
        end
      end
      cards = player.room.logic:moveCardsHoldingAreaCheck(cards)
      if #cards > 0 then
        event:setCostData(self, {cards = cards})
        return true
      end
    end
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local cards = table.simpleClone(event:getCostData(self).cards)
    local prompt = "#jianlou2-invoke"
    if #cards == 1 then
      prompt = "#jianlou1-invoke:::"..Fk:getCardById(cards[1]):toLogString()
    end
    local card = room:askToDiscard(player, {
      min_num = 1,
      max_num = 1,
      include_equip = true,
      skill_name = jianlou.name,
      cancelable = true,
      prompt = prompt,
      skip = true,
    })
    if #card > 0 then
      event:setCostData(self, {cards = card, extra_data = cards})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    room:throwCard(event:getCostData(self).cards, jianlou.name, player, player)
    if player.dead then return end
    local card = table.filter(event:getCostData(self).extra_data, function (c)
      return table.contains(room.discard_pile, c)
    end)
    if #card == 0 then
      return
    elseif #card > 1 then
      card = room:askToChooseCard(player, {
        target = player,
        flag = { card_data = {{ jianlou.name, card }} },
        skill_name = jianlou.name,
        prompt = "#jianlou-prey",
      })
      card = {card}
    end
    room:moveCardTo(card, Card.PlayerHand, player, fk.ReasonJustMove, jianlou.name, nil, true, player)
    if player.dead or not table.contains(player:getCardIds("h"), card[1]) then return end
    card = Fk:getCardById(card[1])
    if #player:getEquipments(card.sub_type) == 0 and player:canUse(card) then
      if player:canUseTo(card, player) then
        room:useCard({
          from = player,
          tos = {player},
          card = card,
        })
      else
        room:askToUseRealCard(player, {
          pattern = {card.id},
          skill_name = jianlou.name,
          prompt = "#jianlou-use:::"..card:toLogString(),
          cancelable = false,
        })
      end
    end
  end,
})

return jianlou
