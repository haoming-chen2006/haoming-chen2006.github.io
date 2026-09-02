local jixi = fk.CreateSkill {
  name = "jixi",
}

Fk:loadTranslationTable{
  ["jixi"] = "急袭",
  [":jixi"] = "你可以将一张“田”当【顺手牵羊】使用。",

  ["#jixi"] = "急袭：你可以将一张“田”当【顺手牵羊】使用",

  ["$jixi1"] = "偷渡阴平，直取蜀汉！",
  ["$jixi2"] = "攻其无备，出其不意！",
}

jixi:addEffect("viewas", {
  anim_type = "control",
  pattern = "snatch",
  expand_pile = "dengai_field",
  filter_pattern = {
    min_num = 1,
    max_num = 1,
    pattern = ".|.|.|dengai_field",
  },
  view_as = function(self, player, cards)
    if #cards ~= 1 then return end
    local c = Fk:cloneCard("snatch")
    c.skillName = jixi.name
    c:addSubcard(cards[1])
    return c
  end,
  enabled_at_response = function (self, player, response)
    return not response
  end,
})

return jixi
