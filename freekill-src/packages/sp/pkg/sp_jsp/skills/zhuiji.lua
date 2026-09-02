
local zhuiji = fk.CreateSkill {
  name = "zhuiji",
  tags = { Skill.Compulsory },
}

Fk:loadTranslationTable{
  ["zhuiji"] = "追击",
  [":zhuiji"] = "锁定技，你计算体力值比你少的角色的距离始终为1。",
}

zhuiji:addEffect("distance", {
  fixed_func = function(self, from, to)
    if from:hasSkill(zhuiji.name) and from.hp > to.hp then
      return 1
    end
  end,
})

return zhuiji
