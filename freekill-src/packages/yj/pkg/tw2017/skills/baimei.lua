local baimei = fk.CreateSkill {
  name = "tw__baimei",
  tags = { Skill.Compulsory },
}

Fk:loadTranslationTable{
  ["tw__baimei"] = "白眉",
  [":tw__baimei"] = "鎖定技，若你沒有手牌，防止你受到的錦囊牌傷害和屬性傷害。",
}

baimei:addEffect(fk.DetermineDamageInflicted, {
  anim_type = "defensive",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(baimei.name) and player:isKongcheng() and
      ((data.card and data.card.type == Card.TypeTrick) or data.damageType ~= fk.NormalDamage)
  end,
  on_use = function (self, event, target, player, data)
    data:preventDamage()
  end,
})

return baimei
