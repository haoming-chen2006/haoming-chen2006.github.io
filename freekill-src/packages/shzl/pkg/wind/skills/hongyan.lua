local hongyan = fk.CreateSkill({
  name = "hongyan",
  tags = {Skill.Compulsory},
})

Fk:loadTranslationTable{
  ["hongyan"] = "红颜",
  [":hongyan"] = "锁定技，你的♠牌视为<font color='red'>♥</font>牌。",

  ["$hongyan"] = "（红颜）",
}

hongyan:addEffect("filter", {
  card_filter = function(self, to_select, player, isJudgeEvent)
    return to_select.suit == Card.Spade and player:hasSkill(hongyan.name) and
    (table.contains(player:getCardIds("he"), to_select.id) or isJudgeEvent)
  end,
  view_as = function(self, player, to_select)
    return Fk:cloneCard(to_select.name, Card.Heart, to_select.number)
  end,
})

return hongyan
