local yangge = fk.CreateSkill {
  name = "yangge",
  attached_skill_name = "yangge&",
}

Fk:loadTranslationTable{
  ["yangge"] = "扬戈",
  [":yangge"] = "每轮限一次，体力值最低的其他角色可以于其出牌阶段对你发动〖密诏〗。",
}

yangge:addEffect("visibility", {
})

return yangge
