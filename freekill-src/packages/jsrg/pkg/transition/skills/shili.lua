local shili = fk.CreateSkill {
  name = "shili",
}

Fk:loadTranslationTable{
  ["shili"] = "恃力",
  [":shili"] = "出牌阶段限一次，你可以将一张手牌中的装备牌当【决斗】使用。",

  ["#shili"] = "恃力：你可以将一张手牌中的装备牌当【决斗】使用。",
}

shili:addEffect("viewas", {
  anim_type = "offensive",
  prompt = "#shili",
  card_filter = function(self, player, to_select, selected)
    return #selected == 0 and Fk:getCardById(to_select).type == Card.TypeEquip and
      table.contains(player:getCardIds("h"), to_select)
  end,
  view_as = function(self, player, cards)
    if #cards ~= 1 then return end
    local c = Fk:cloneCard("duel")
    c.skillName = shili.name
    c:addSubcard(cards[1])
    return c
  end,
  enabled_at_play = function(self, player)
    return player:usedSkillTimes(shili.name, Player.HistoryPhase) == 0
  end,
})

return shili
