local zhenqiao = fk.CreateSkill {
  name = "zhenqiao",
  tags = { Skill.Compulsory },
}

Fk:loadTranslationTable{
  ["zhenqiao"] = "振鞘",
  [":zhenqiao"] = "锁定技，你的攻击范围+1；当你使用【杀】指定目标后，若你的装备区没有武器牌，则此【杀】额外结算一次。",

  ["$zhenqiao1"] = "豺狼满朝，且看我剑出鞘。",
  ["$zhenqiao2"] = "欲信大义，此剑一匡天下。",
}

zhenqiao:addEffect(fk.TargetSpecified, {
  anim_type = "offensive",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(zhenqiao.name) and
      data.card.trueName == "slash" and data.firstTarget and #player:getEquipments(Card.SubtypeWeapon) == 0
  end,
  on_use = function(self, event, target, player, data)
    data.use.additionalEffect = (data.use.additionalEffect or 0) + 1
  end,
})

zhenqiao:addEffect("atkrange", {
  correct_func = function(self, from, to)
    if from:hasSkill(zhenqiao.name) then
      return 1
    end
  end,
})

return zhenqiao
