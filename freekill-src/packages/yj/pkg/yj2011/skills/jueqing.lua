local jueqing = fk.CreateSkill {
  name = "jueqing",
  tags = { Skill.Compulsory },
}

Fk:loadTranslationTable{
  ["jueqing"] = "绝情",
  [":jueqing"] = "锁定技，你造成的伤害均视为体力流失。",

  ["$jueqing1"] = "你的死活，与我何干？",
  ["$jueqing2"] = "无来无去，不悔不怨。",
}

jueqing:addEffect(fk.PreDamage, {
  anim_type = "offensive",
  on_use = function(self, event, target, player, data)
    player.room:loseHp(data.to, data.damage, jueqing.name)
    data:preventDamage()
  end,
})

return jueqing