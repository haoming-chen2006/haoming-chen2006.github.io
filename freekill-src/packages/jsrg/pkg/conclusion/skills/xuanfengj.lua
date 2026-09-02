local xuanfeng = fk.CreateSkill {
  name = "xuanfengj",
  tags = { Skill.AttachedKingdom },
  attached_kingdom = {"shu"},
}

Fk:loadTranslationTable{
  ["xuanfengj"] = "选锋",
  [":xuanfengj"] = "蜀势力技，你可以将一张【影】当无距离次数限制的刺【杀】使用。",

  ["#xuanfengj"] = "选锋：将一张【影】当无距离次数限制的刺【杀】使用",
}

xuanfeng:addEffect("viewas", {
  anim_type = "offensive",
  pattern = "stab__slash",
  prompt = "#xuanfengj",
  handly_pile = true,
  card_filter = function(self, player, to_select, selected)
    return #selected == 0 and Fk:getCardById(to_select).name == "shade"
  end,
  view_as = function(self, player, cards)
    if #cards ~= 1 then return end
    local card = Fk:cloneCard("stab__slash")
    card:addSubcard(cards[1])
    card.skillName = xuanfeng.name
    return card
  end,
  enabled_at_response = function (self, player, response)
    return not response
  end,
})

xuanfeng:addEffect("targetmod", {
  bypass_times = function(self, player, skill, scope, card, to)
    return card and card.name == "stab__slash" and table.contains(card.skillNames, xuanfeng.name)
  end,
  bypass_distances = function(self, player, skill, card, to)
    return card and card.name == "stab__slash" and table.contains(card.skillNames, xuanfeng.name)
  end,
})

return xuanfeng
