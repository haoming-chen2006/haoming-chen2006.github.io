local junlue = fk.CreateSkill {
  name = "junlue",
  tags = { Skill.Compulsory },
}

Fk:loadTranslationTable{
  ["junlue"] = "军略",
  [":junlue"] = "锁定技，当你造成或受到1点伤害后，你获得一枚“军略”。",

  ["@junlue"] = "军略",

  ["$junlue1"] = "军略绵腹，制敌千里。",
  ["$junlue2"] = "文韬武略兼备，方可破敌如破竹。",
}

junlue:addLoseEffect(function (self, player)
  player.room:setPlayerMark(player, "@junlue", 0)
end)
junlue:addEffect(fk.Damage, {
  on_use = function(self, event, target, player, data)
    player.room:addPlayerMark(player, "@junlue", data.damage)
  end,
})
junlue:addEffect(fk.Damaged, {
  on_use = function(self, event, target, player, data)
    player.room:addPlayerMark(player, "@junlue", data.damage)
  end,
})

return junlue
