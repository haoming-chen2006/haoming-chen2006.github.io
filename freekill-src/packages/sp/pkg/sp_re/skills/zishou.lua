local zishou = fk.CreateSkill {
  name = "re__zishou",
}

Fk:loadTranslationTable{
  ["re__zishou"] = "自守",
  [":re__zishou"] = "摸牌阶段，你可以额外摸X张牌（X为全场势力数）。若如此做，直到回合结束，其他角色不能被选择为你使用牌的目标。",

  ["$re__zishou1"] = "荆襄之地，固若金汤。",
  ["$re__zishou2"] = "江河霸主，何惧之有？",
}

zishou:addEffect(fk.DrawNCards, {
  anim_type = "drawcard",
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(zishou.name) and player.phase == Player.Draw
  end,
  on_use = function(self, event, target, player, data)
    local kingdoms = {}
    for _, p in ipairs(player.room.alive_players) do
      table.insertIfNeed(kingdoms, p.kingdom)
    end
    data.n = data.n + #kingdoms
  end,
})

zishou:addEffect("prohibit", {
  is_prohibited = function(self, from, to, card)
    return from and from:usedSkillTimes("re__zishou", Player.HistoryTurn) > 0 and card and from ~= to
  end,
})

return zishou
