
local gongqi = fk.CreateSkill {
  name = "nos__gongqi",
}

Fk:loadTranslationTable{
  ["nos__gongqi"] = "弓骑",
  [":nos__gongqi"] = "你可以将一张装备牌当【杀】使用或打出；你以此法使用的【杀】无距离限制。",

  ["#nos__gongqi"] = "弓骑：你可以将一张装备牌当无距离限制的【杀】使用或打出",

  ["$nos__gongqi1"] = "鼠辈，哪里走！",
  ["$nos__gongqi2"] = "吃我一箭！",
}

gongqi:addEffect("viewas", {
  anim_type = "offensive",
  pattern = "slash",
  prompt = "#nos__gongqi",
  handly_pile = true,
  filter_pattern = {
    min_num = 1,
    max_num = 1,
    pattern = ".|.|.|.|.|equip",
  },
  view_as = function(self, player, cards)
    if #cards ~= 1 then return nil end
    local card = Fk:cloneCard("slash")
    card:addSubcard(cards[1])
    card.skillName = gongqi.name
    return card
  end,
})

gongqi:addEffect("targetmod", {
  bypass_distances = function (self, player, skill, card, to)
    return card and table.contains(card.skillNames, gongqi.name)
  end,
})

gongqi:addAI(nil, "vs_skill")

return gongqi
