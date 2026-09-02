local zhijian = fk.CreateSkill {
  name = "zhijian",
}

Fk:loadTranslationTable{
  ["zhijian"] = "直谏",
  [":zhijian"] = "出牌阶段，你可以将手牌中的一张装备牌置于其他角色的装备区里，然后摸一张牌。",

  ["#zhijian"] = "直谏：选择一张装备牌置入其他角色的装备区，然后摸一张牌",

  ["$zhijian1"] = "请恕老臣直言！",
  ["$zhijian2"] = "为臣者，当冒死以谏！",
}

zhijian:addEffect("active", {
  anim_type = "support",
  card_num = 1,
  target_num = 1,
  prompt = "#zhijian",
  card_filter = function(self, player, to_select, selected)
    return #selected == 0 and Fk:getCardById(to_select).type == Card.TypeEquip and
      table.contains(player:getCardIds("h"), to_select)
  end,
  target_filter = function(self, player, to_select, selected, selected_cards)
    return #selected == 0 and #selected_cards == 1 and to_select ~= player and
      to_select:canMoveCardIntoEquip(selected_cards[1], false)
  end,
  on_use = function(self, room, effect)
    local player = effect.from
    local target = effect.tos[1]
    room:moveCardIntoEquip(target, effect.cards[1], zhijian.name, false, player)
    if not player.dead then
      room:drawCards(player, 1, zhijian.name)
    end
  end,
})

return zhijian
