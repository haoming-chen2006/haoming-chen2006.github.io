local zhuiji = fk.CreateSkill {
  name = "sp__zhuiji",
  tags = { Skill.Compulsory },
}

Fk:loadTranslationTable{
  ["sp__zhuiji"] = "追击",
  [":sp__zhuiji"] = "锁定技，你计算体力值不大于你的角色的距离始终为1。",
}

zhuiji:addEffect("distance", {
  fixed_func = function(self, from, to)
    if from:hasSkill(zhuiji.name) and from.hp >= to.hp then
      return 1
    end
  end,
})

return zhuiji
