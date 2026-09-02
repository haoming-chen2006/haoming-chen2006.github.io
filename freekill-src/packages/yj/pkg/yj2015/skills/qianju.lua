
local qianju = fk.CreateSkill {
  name = "qianju",
  tags = { Skill.Compulsory },
}

Fk:loadTranslationTable{
  ["qianju"] = "千驹",
  [":qianju"] = "锁定技，你计算与其他角色的距离-X。（X为你已损失的体力值）",
}

qianju:addEffect("distance", {
  correct_func = function(self, from, to)
    if from:hasSkill(qianju.name) then
      return -from:getLostHp()
    end
  end,
})

return qianju
