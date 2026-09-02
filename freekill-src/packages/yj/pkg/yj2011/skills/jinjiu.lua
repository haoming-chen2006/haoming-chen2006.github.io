
local jinjiu = fk.CreateSkill {
  name = "jinjiu",
  tags = { Skill.Compulsory },
}

Fk:loadTranslationTable{
  ["jinjiu"] = "禁酒",
  [":jinjiu"] = "锁定技，你的【酒】和你为【酒】的判定牌视为【杀】。",

  ["$jinjiu1"] = "贬酒阙色，所以无污。",
  ["$jinjiu2"] = "避嫌远疑，所以无误。",
}

jinjiu:addEffect("filter", {
  anim_type = "offensive",
  card_filter = function(self, card, player, isJudgeEvent)
    return player:hasSkill(jinjiu.name) and card.name == "analeptic" and
      (table.contains(player:getCardIds("h"), card.id) or isJudgeEvent)
  end,
  view_as = function(self, player, card)
    return Fk:cloneCard("slash", card.suit, card.number)
  end,
})

return jinjiu
