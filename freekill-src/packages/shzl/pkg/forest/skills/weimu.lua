local weimu = fk.CreateSkill {
  name = "weimu",
  tags = { Skill.Compulsory },
}

Fk:loadTranslationTable{
  ["weimu"] = "帷幕",
  [":weimu"] = "锁定技，你不是黑色锦囊牌的合法目标。",

  ["$weimu1"] = "此计伤不到我。",
  ["$weimu2"] = "你奈我何？",
}

weimu:addEffect("prohibit", {
  is_prohibited = function(self, from, to, card)
    return to:hasSkill(weimu.name) and card.type == Card.TypeTrick and card.color == Card.Black
  end,
})

return weimu
