local duanliang = fk.CreateSkill {
  name = "duanliang",
}

Fk:loadTranslationTable{
  ["duanliang"] = "断粮",
  [":duanliang"] = "你可以将一张黑色基本牌或黑色装备牌当【兵粮寸断】使用；你可以对距离为2的角色使用【兵粮寸断】。",

  ["#duanliang"] = "断粮：你可以将一张黑色基本牌或黑色装备牌当【兵粮寸断】使用",

  ["$duanliang1"] = "截其源，断其粮，贼可擒也。",
  ["$duanliang2"] = "人是铁，饭是钢。",
}

duanliang:addEffect("viewas", {
  anim_type = "control",
  pattern = "supply_shortage",
  handly_pile = true,
  filter_pattern = {
    min_num = 1,
    max_num = 1,
    pattern = ".|.|black|.|.|basic,equip",
  },
  view_as = function(self, player, cards)
    if #cards ~= 1 then return end
    local card = Fk:cloneCard("supply_shortage")
    card.skillName = duanliang.name
    card:addSubcard(cards[1])
    return card
  end,
  enabled_at_response = function (self, player, response)
    return not response
  end,
})
duanliang:addEffect("targetmod", {
  distance_limit_func =  function(self, player, skill)
    if player:hasSkill(duanliang.name) and skill.name == "supply_shortage_skill" then
      return 1
    end
  end,
})

return duanliang
