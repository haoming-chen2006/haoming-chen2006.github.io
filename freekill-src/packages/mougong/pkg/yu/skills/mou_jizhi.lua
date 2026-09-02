local mouJizhi = fk.CreateSkill({
  name = "mou__jizhi",
  tags = { Skill.Compulsory },
})

Fk:loadTranslationTable{
  ["mou__jizhi"] = "集智",
  [":mou__jizhi"] = "锁定技，当你使用普通锦囊牌时，你摸一张牌，以此法获得的牌本回合不计入手牌上限。",

  ["@@mou__jizhi-inhand-turn"] = "集智",

  ["$mou__jizhi1"] = "解之有万法，吾独得千计。",
  ["$mou__jizhi2"] = "慧思万千，以成我之所想。",
}

mouJizhi:addEffect(fk.CardUsing, {
  anim_type = "drawcard",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(mouJizhi.name) and data.card:isCommonTrick()
  end,
  on_use = function(self, event, target, player, data)
    player:drawCards(1, mouJizhi.name, nil, "@@mou__jizhi-inhand-turn")
  end,
})

mouJizhi:addEffect("maxcards", {
  exclude_from = function(self, player, card)
    return card:getMark("@@mou__jizhi-inhand-turn") > 0
  end,
})

return mouJizhi
