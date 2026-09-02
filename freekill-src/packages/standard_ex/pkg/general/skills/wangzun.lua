
local wangzun = fk.CreateSkill{
  name = "wangzun",
}

Fk:loadTranslationTable{
  ["wangzun"] = "妄尊",
  [":wangzun"] = "主公的准备阶段，你可以摸一张牌，然后其本回合手牌上限-1。",

  ["$wangzun1"] = "真命天子，八方拜服。",
  ["$wangzun2"] = "归顺于我，封爵赏地。",
}

wangzun:addEffect(fk.EventPhaseStart, {
  anim_type = "drawcard",
  can_trigger = function(self, event, target, player, data)
    return target.phase == Player.Start and player:hasSkill(wangzun.name) and target.role == "lord"
  end,
  on_use = function(self, event, target, player, data)
    player:drawCards(1, wangzun.name)
    if not target.dead and target:getMaxCards() > 0 then
      player.room:addPlayerMark(target, MarkEnum.MinusMaxCardsInTurn)
    end
  end,
})

return wangzun
