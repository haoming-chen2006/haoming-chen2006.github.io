local jiaohao_active = fk.CreateSkill {
  name = "jiaohao&",
}

Fk:loadTranslationTable{
  ["jiaohao&"] = "骄豪",
  [":jiaohao&"] = "出牌阶段限一次，你可以将手牌中的一张装备牌置于孙尚香的装备区内。",

  ["#jiaohao&"] = "骄豪：你可以将手牌中一张装备置入孙尚香的装备区",
}

jiaohao_active:addEffect("active", {
  anim_type = "support",
  prompt = "#jiaohao&",
  card_num = 1,
  target_num = 1,
  card_filter = function(self, player, to_select, selected)
    return #selected == 0 and Fk:getCardById(to_select).type == Card.TypeEquip and
      table.contains(player:getCardIds("h"), to_select)
  end,
  target_filter = function(self, player, to_select, selected, selected_cards)
    return #selected == 0 and #selected_cards == 1 and to_select ~= player and to_select:hasSkill("jiaohao") and
      not table.contains(player:getTableMark("jiaohao-phase"), to_select.id) and
      to_select:hasEmptyEquipSlot(Fk:getCardById(selected_cards[1]).sub_type)
  end,
  on_use = function(self, room, effect)
    room:addTableMark(effect.from, "jiaohao-phase", effect.tos[1].id)
    room:moveCardIntoEquip(effect.tos[1], effect.cards, "jiahao", false, effect.from)
  end,
})

return jiaohao_active
