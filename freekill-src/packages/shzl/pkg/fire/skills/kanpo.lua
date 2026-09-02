local kanpo = fk.CreateSkill {
  name = "kanpo",
}

Fk:loadTranslationTable{
  ["kanpo"] = "看破",
  [":kanpo"] = "你可以将一张黑色手牌当【无懈可击】使用。",

  ["#kanpo"] = "看破：你可以将一张黑色手牌当【无懈可击】使用",

  ["$kanpo1"] = "雕虫小技。",
  ["$kanpo2"] = "你的计谋被识破了。",
}

kanpo:addEffect("viewas", {
  anim_type = "control",
  pattern = "nullification|.|club,spade",
  prompt = "#kanpo",
  handly_pile = true,
  filter_pattern = {
    min_num = 1,
    max_num = 1,
    pattern = ".|.|black|^equip",
  },
  view_as = function(self, player, cards)
    if #cards ~= 1 then return end
    local card = Fk:cloneCard("nullification")
    card.skillName = kanpo.name
    card:addSubcard(cards[1])
    return card
  end,
  enabled_at_nullification = function (self, player, data)
    return #player:getHandlyIds() > 0
  end,
})

kanpo:addAI(nil, "vs_skill")

return kanpo
