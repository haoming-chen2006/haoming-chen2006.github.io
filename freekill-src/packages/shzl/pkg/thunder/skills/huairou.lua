local huairou = fk.CreateSkill {
  name = "huairou",
}

Fk:loadTranslationTable{
  ["huairou"] = "怀柔",
  [":huairou"] = "出牌阶段，你可以重铸一张装备牌。",

  ["#huairou"] = "怀柔：你可以重铸装备牌",

  ["$huairou1"] = "各保分界，无求细利。",
  ["$huairou2"] = "胸怀千万，彰其德，包其柔。",
}

huairou:addEffect("active", {
  anim_type = "drawcard",
  prompt = "#huairou",
  card_num = 1,
  target_num = 0,
  can_use = Util.TrueFunc,
  card_filter = function(self, player, to_select, selected)
    return #selected == 0 and Fk:getCardById(to_select).type == Card.TypeEquip
  end,
  on_use = function(self, room, effect)
    room:recastCard(effect.cards, effect.from, huairou.name)
  end,
})

return huairou
