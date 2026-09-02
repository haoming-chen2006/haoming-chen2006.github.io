local qiluan_active = fk.CreateSkill {
  name = "js__qiluan_active"
}

Fk:loadTranslationTable{
  ["js__qiluan_active"] = "起乱",
}

qiluan_active:addEffect("active", {
  min_card_num = 1,
  min_target_num = 1,
  card_filter = function(self, player, to_select, selected)
    return not player:prohibitDiscard(to_select)
  end,
  target_filter = function(self, player, to_select, selected, selected_cards)
    return #selected < #selected_cards and to_select ~= player
  end,
  feasible = function (self, player, selected, selected_cards, card)
    return #selected == #selected_cards and #selected > 0
  end,
})

return qiluan_active
