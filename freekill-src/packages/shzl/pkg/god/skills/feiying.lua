local feiying = fk.CreateSkill {
  name = "feiying",
  tags = { Skill.Compulsory },
}

Fk:loadTranslationTable{
  ["feiying"] = "飞影",
  [":feiying"] = "锁定技，其他角色至你距离+1。",
}

feiying:addEffect("distance", {
  correct_func = function(self, from, to)
    if to:hasSkill(feiying.name) then
      return 1
    end
  end,
})

return feiying
