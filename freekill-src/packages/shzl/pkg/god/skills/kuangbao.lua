local kuangbao = fk.CreateSkill {
  name = "kuangbao",
  tags = { Skill.Compulsory },
}

Fk:loadTranslationTable{
  ["kuangbao"] = "狂暴",
  [":kuangbao"] = "锁定技，游戏开始时，你获得2枚“暴怒”；当你造成或受到1点伤害后，你获得1枚“暴怒”。",

  ["@baonu"] = "暴怒",

  ["$kuangbao1"] = "嗯→↗↑↑↑↓……",
  ["$kuangbao2"] = "哼！",
}

kuangbao:addLoseEffect(function (self, player)
  player.room:setPlayerMark(player, "@baonu", 0)
end)
kuangbao:addEffect(fk.GameStart, {
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(kuangbao.name)
  end,
  on_use = function(self, event, target, player, data)
    player.room:addPlayerMark(player, "@baonu", 2)
  end,
})
kuangbao:addEffect(fk.Damage, {
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(kuangbao.name)
  end,
  on_use = function(self, event, target, player, data)
    player.room:addPlayerMark(player, "@baonu", data.damage)
  end,
})
kuangbao:addEffect(fk.Damaged, {
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(kuangbao.name)
  end,
  on_use = function(self, event, target, player, data)
    player.room:addPlayerMark(player, "@baonu", data.damage)
  end,
})

return kuangbao
