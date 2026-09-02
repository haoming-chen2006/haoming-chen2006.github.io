local jyie = fk.CreateSkill {
  name = "jyie",
  tags = { Skill.Compulsory },
}

Fk:loadTranslationTable{
  ["jyie"] = "嫉恶",
  [":jyie"] = "锁定技，你使用的红色【杀】造成的伤害+1。",
}

jyie:addEffect(fk.CardUsing, {
  anim_type = "offensive",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(jyie.name) and
      data.card.trueName == "slash" and data.card.color == Card.Red
  end,
  on_use = function(self, event, target, player, data)
    data.additionalDamage = (data.additionalDamage or 0) + 1
  end,
})

return jyie
