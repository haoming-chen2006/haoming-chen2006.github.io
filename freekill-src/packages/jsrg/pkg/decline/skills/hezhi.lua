local hezhi = fk.CreateSkill {
  name = "hezhi",
  tags = { Skill.Lord, Skill.Compulsory },
}

Fk:loadTranslationTable{
  ["hezhi"] = "合志",
  [":hezhi"] = "主公技，锁定技，其他群势力角色因〖诛逆〗指定的角色视为与你指定的角色相同。",
}

hezhi:addEffect("visibility", {})

return hezhi
