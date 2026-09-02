local huaiju = fk.CreateSkill {
  name = "huaiju",
  tags = { Skill.Compulsory },
}

Fk:loadTranslationTable{
  ["huaiju"] = "怀橘",
  [":huaiju"] = "锁定技，游戏开始时，你获得3枚“橘”标记。当有“橘”的角色受到伤害时，防止此伤害并移除1枚“橘”。有“橘”的角色摸牌阶段多摸一张牌。",

  ["@orange"] = "橘",

  ["$huaiju1"] = "情深舐犊，怀擢藏橘。",
  ["$huaiju2"] = "袖中怀绿桔，遗母报乳哺。",
}

huaiju:addLoseEffect(function (self, player)
  local room = player.room
  if table.every(room.alive_players, function (p)
    return not p:hasSkill(huaiju.name, true, true)
  end) then
    for _, p in ipairs(room.alive_players) do
      room:setPlayerMark(p, "@orange", 0)
    end
  end
end)
huaiju:addEffect(fk.GameStart, {
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(huaiju.name)
  end,
  on_use = function(self, event, target, player, data)
    player.room:addPlayerMark(player, "@orange", 3)
  end,
})
huaiju:addEffect(fk.DrawNCards, {
  anim_type = "drawcard",
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(huaiju.name) and target:getMark("@orange") > 0
  end,
  on_use = function(self, event, target, player, data)
    data.n = data.n + 1
  end,
})
huaiju:addEffect(fk.DetermineDamageInflicted, {
  anim_type = "defensive",
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(huaiju.name) and target:getMark("@orange") > 0
  end,
  on_use = function(self, event, target, player, data)
    player.room:removePlayerMark(target, "@orange")
    data:preventDamage()
  end,
})

return huaiju
