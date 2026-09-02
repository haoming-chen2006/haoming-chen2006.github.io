local jijun = fk.CreateSkill {
  name = "sp__jijun",
}

Fk:loadTranslationTable {
  ["sp__jijun"] = "集军",
  [":sp__jijun"] = "出牌阶段，你可以将任意张手牌置于武将牌上。",

  ["#sp__jijun"] = "集军：你可以将任意张手牌置于武将牌上！",
}

jijun:addEffect("active", {
  prompt = "#sp__jijun",
  min_card_num = 1,
  target_num = 0,
  card_filter = function(self, player, to_select, selected)
    return table.contains(player:getCardIds("h"), to_select)
  end,
  on_use = function(self, room, effect)
    effect.from:addToPile(jijun.name, effect.cards, true, jijun.name, effect.from)
  end,
})

return jijun
