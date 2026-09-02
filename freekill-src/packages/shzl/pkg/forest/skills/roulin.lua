local roulin = fk.CreateSkill {
  name = "roulin",
  tags = { Skill.Compulsory },
}

Fk:loadTranslationTable{
  ["roulin"] = "肉林",
  [":roulin"] = "锁定技，你对女性角色使用【杀】，或女性角色对你使用【杀】均需两张【闪】才能抵消。",

  ["$roulin1"] = "美人儿，来，香一个~~",
  ["$roulin2"] = "食色，性也~~",
}

roulin:addEffect(fk.TargetSpecified, {
  anim_type = "offensive",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(roulin.name) and data.card.trueName == "slash" and data.to:isFemale()
  end,
  on_use = function(self, event, target, player, data)
    data:setResponseTimes(2)
  end,
})

roulin:addEffect(fk.TargetConfirmed, {
  anim_type = "negative",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(roulin.name) and data.card.trueName == "slash" and data.from:isFemale()
  end,
  on_use = function(self, event, target, player, data)
    data:setResponseTimes(2)
  end,
})

return roulin
