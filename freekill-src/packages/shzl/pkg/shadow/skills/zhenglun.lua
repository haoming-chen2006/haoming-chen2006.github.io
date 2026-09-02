local zhenglun = fk.CreateSkill {
  name = "zhenglun",
}

Fk:loadTranslationTable{
  ["zhenglun"] = "整论",
  [":zhenglun"] = "摸牌阶段开始前，若你没有“橘”，你可以跳过摸牌阶段并获得1枚“橘”。",

  ["$zhenglun1"] = "整论四海未泰，修文德以平。",
  ["$zhenglun2"] = "今论者不务道德怀取之术，而惟尚武，窃所未安。",
}

zhenglun:addEffect(fk.EventPhaseChanging, {
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(zhenglun.name) and
      data.phase == Player.Draw and not data.skipped and player:getMark("@orange") == 0
  end,
  on_use = function(self, event, target, player, data)
    data.skipped = true
    player.room:addPlayerMark(player, "@orange")
  end,
})

return zhenglun
