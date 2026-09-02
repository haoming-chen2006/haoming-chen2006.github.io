local wushen = fk.CreateSkill {
  name = "wushen",
  tags = {Skill.Compulsory},
}

Fk:loadTranslationTable{
  ["wushen"] = "武神",
  [":wushen"] = "锁定技，你的<font color='red'>♥</font>手牌视为【杀】；你使用<font color='red'>♥</font>【杀】无距离限制。",

  ["$wushen1"] = "取汝狗头，犹如探囊取物！",
  ["$wushen2"] = "还不速速领死！",
}

wushen:addEffect("filter", {
  card_filter = function(self, to_select, player)
    return player:hasSkill(wushen.name) and to_select.suit == Card.Heart and
      table.contains(player:getCardIds("h"), to_select.id)
  end,
  view_as = function(self, player, to_select)
    local card = Fk:cloneCard("slash", Card.Heart, to_select.number)
    card.skillName = wushen.name
    return card
  end,
})
wushen:addEffect("targetmod", {
  bypass_distances =  function(self, player, skill, card, to)
    return player:hasSkill(wushen.name) and card and card.trueName == "slash" and card.suit == Card.Heart
  end,
})

return wushen
