local jiuchi = fk.CreateSkill {
  name = "jiuchi",
}

Fk:loadTranslationTable{
  ["jiuchi"] = "酒池",
  [":jiuchi"] = "你可以将一张♠手牌当【酒】使用。",

  ["#jiuchi"] = "酒池：你可以将一张♠手牌当【酒】使用",

  ["$jiuchi1"] = "呃……再来……一壶……",
  ["$jiuchi2"] = "好酒！好酒！",
}

jiuchi:addEffect("viewas", {
  anim_type = "offensive",
  pattern = "analeptic",
  prompt = "#jiuchi",
  handly_pile = true,
  filter_pattern = {
    min_num = 1,
    max_num = 1,
    pattern = ".|.|spade|^equip",
  },
  view_as = function(self, player, cards)
    if #cards ~= 1 then return end
    local c = Fk:cloneCard("analeptic")
    c.skillName = jiuchi.name
    c:addSubcard(cards[1])
    return c
  end,
  enabled_at_response = function (self, player, response)
    return not response
  end,
})

jiuchi:addAI(nil, "vs_skill")

return jiuchi
