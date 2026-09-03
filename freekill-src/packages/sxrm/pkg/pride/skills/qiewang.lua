local qiewang = fk.CreateSkill {
  name = "qiewang",
  tags = { Skill.Compulsory },
}

Fk:loadTranslationTable{
  ["qiewang"] = "怯亡",
  [":qiewang"] = "锁定技，与你距离1以内的角色受到伤害后，你摸一张牌，你的手牌本回合均视为【无懈可击】。",

  ["@@qiewang-turn"] = "怯亡",
}

qiewang:addEffect(fk.Damaged, {
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(qiewang.name) and target:isAlive() and target:distanceTo(player) <= 1
  end,
  on_use = function(self, event, target, player, data)
    player:drawCards(1, qiewang.name)
    player.room:setPlayerMark(player, "@@qiewang-turn", 1)
    player:filterHandcards()
  end,
})

qiewang:addEffect("filter", {
  anim_type = "defensive",
  card_filter = function(self, card, player)
    return player:getMark("@@qiewang-turn") > 0 and table.contains(player:getCardIds("h"), card.id)
  end,
  view_as = function(self, player, card)
    local c = Fk:cloneCard("nullification", card.suit, card.number)
    c.skillName = qiewang.name
    return c
  end,
})

return qiewang
