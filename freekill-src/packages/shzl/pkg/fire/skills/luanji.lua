local luanji = fk.CreateSkill {
  name = "luanji",
}

Fk:loadTranslationTable{
  ["luanji"] = "乱击",
  [":luanji"] = "出牌阶段，你可以将任意两张相同花色的手牌当【万箭齐发】使用。",

  ["#luanji"] = "乱击：你可以将两张相同花色的手牌当【万箭齐发】使用",

  ["$luanji1"] = "弓箭手，准备放箭！",
  ["$luanji2"] = "全都去死吧！",
}

luanji:addEffect("viewas", {
  anim_type = "offensive",
  pattern = "archery_attack|0|nosuit,red,black",
  prompt = "#luanji",
  handly_pile = true,
  filter_pattern = function (self, player, card_name, selected)
    local vs_pattern = {
      max_num = 2,
      min_num = 2,
      pattern = ".|.|^nosuit|^equip",
    }
    if selected and #selected > 0 then
      vs_pattern.pattern = ".|.|".. Fk:getCardById(selected[1]):getSuitString() .."|^equip"
    end
    return vs_pattern
  end,
  view_as = function(self, player, cards)
    if #cards ~= 2 then return end
    local card = Fk:cloneCard("archery_attack")
    card.skillName = luanji.name
    card:addSubcards(cards)
    return card
  end,
})

luanji:addAI(nil, "vs_skill")

return luanji
