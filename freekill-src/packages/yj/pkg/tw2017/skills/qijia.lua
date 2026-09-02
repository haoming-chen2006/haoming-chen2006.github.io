local qijia = fk.CreateSkill {
  name = "tw__qijia",
}

Fk:loadTranslationTable{
  ["tw__qijia"] = "弃甲",
  [":tw__qijia"] = "出牌階段，你可以棄置裝備區內一張牌（每種副類別每階段限一次），視為對攻擊範圍內一名角色使用一張不計次數的【殺】。",

  ["#tw__qijia"] = "弃甲：弃置一张本阶段未弃置过副类别的装备，视为使用不计次数的【杀】",
}

qijia:addEffect("active", {
  anim_type = "offensive",
  prompt = "#tw__qijia",
  card_num = 1,
  target_num = 1,
  can_use = function(self, player)
    return #player:getCardIds("e") > 0
  end,
  card_filter = function(self, player, to_select, selected)
    return #selected == 0 and table.contains(player:getCardIds("e"), to_select) and
      not table.contains(player:getTableMark("tw__qijia-phase"), Fk:getCardById(to_select).sub_type)
  end,
  target_filter = function(self, player, to_select, selected, selected_cards)
    return #selected == 0 and player:inMyAttackRange(to_select, nil, selected_cards) and
      not player:isProhibited(to_select, Fk:cloneCard("slash"))
  end,
  on_use = function(self, room, effect)
    local player = effect.from
    local target = effect.tos[1]
    room:addTableMark(player, "tw__qijia-phase", Fk:getCardById(effect.cards[1]).sub_type)
    room:throwCard(effect.cards, qijia.name, player, player)
    room:useVirtualCard("slash", nil, player, target, qijia.name, true)
  end,
})

return qijia
