local zhiyan = fk.CreateSkill {
  name = "zhiyan",
}

Fk:loadTranslationTable{
  ["zhiyan"] = "直言",
  [":zhiyan"] = "结束阶段，你可以令一名角色摸一张牌并展示之，若为装备牌，其使用此牌并回复1点体力。",

  ["#zhiyan-choose"] = "直言：令一名角色摸一张牌并展示，若为装备牌，其使用并回复1点体力",
  ["#zhiyan-use"] = "直言：请使用%arg",

  ["$zhiyan1"] = "志节分明，折而不屈！",
  ["$zhiyan2"] = "直言劝谏，不惧祸否！",
}

zhiyan:addEffect(fk.EventPhaseStart, {
  anim_type = "support",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(zhiyan.name) and player.phase == Player.Finish
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local to = room:askToChoosePlayers(player, {
      skill_name = zhiyan.name,
      min_num = 1,
      max_num = 1,
      targets = room.alive_players,
      prompt = "#zhiyan-choose",
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
    local cards = to:drawCards(1, zhiyan.name)
    if #cards == 0 then return end
    local id = cards[1]
    if not table.contains(to:getCardIds("h"), id) then return end
    to:showCards(id)
    if not table.contains(to:getCardIds("h"), id) or to.dead then return end
    room:delay(1000)
    local card = Fk:getCardById(id)
    if card.type == Card.TypeEquip and to:canUse(card) then
      if to:canUseTo(card, to) then
        room:useCard({
          from = to,
          tos = {to},
          card = card,
        })
      else
        room:askToUseRealCard(to, {
          pattern = {card.id},
          skill_name = zhiyan.name,
          prompt = "#zhiyan-use:::"..card:toLogString(),
          cancelable = false,
        })
      end
      if to:isWounded() and not to.dead then
        room:recover{
          who = to,
          num = 1,
          recoverBy = player,
          skillName = zhiyan.name,
        }
      end
    end
  end,
})

return zhiyan
