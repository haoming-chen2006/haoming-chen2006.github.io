local qianjie = fk.CreateSkill {
  name = "qianjie",
  tags = { Skill.Compulsory },
}

Fk:loadTranslationTable{
  ["qianjie"] = "谦节",
  [":qianjie"] = "锁定技，你被横置前，防止之；你不能成为延时类锦囊牌或其他角色拼点的目标。",

  ["$qianjie1"] = "继父之节，谦逊恭毕。",
  ["$qianjie2"] = "谦谦清廉德，节节卓尔茂。",
}

qianjie:addEffect(fk.BeforeChainStateChange, {
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(qianjie.name) and not player.chained
  end,
  on_use = function (self, event, target, player, data)
    data.prevented = true
  end,
})
qianjie:addEffect("prohibit", {
  is_prohibited = function(self, from, to, card)
    return to:hasSkill(qianjie.name) and card and card.sub_type == Card.SubtypeDelayedTrick
  end,
  prohibit_pindian = function(self, from, to)
    return to:hasSkill(qianjie.name)
  end
})

return qianjie
