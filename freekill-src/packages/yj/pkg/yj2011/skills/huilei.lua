local huilei = fk.CreateSkill {
  name = "huilei",
  tags = { Skill.Compulsory },
}

Fk:loadTranslationTable{
  ["huilei"] = "挥泪",
  [":huilei"] = "锁定技，杀死你的角色弃置所有牌。",

  ["$huilei1"] = "丞相视某如子，某以丞相为父。",
  ["$huilei2"] = "谡愿以死安大局。",
}

huilei:addEffect(fk.Death, {
  anim_type = "control",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(huilei.name, false, true) and
      data.killer and not data.killer.dead
  end,
  on_cost = function (self, event, target, player, data)
    event:setCostData(self, {tos = {data.killer}})
    return true
  end,
  on_use = function(self, event, target, player, data)
    data.killer:throwAllCards("he", huilei.name)
  end
})

return huilei