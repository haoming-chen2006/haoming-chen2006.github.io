local mouGuanxing = fk.CreateSkill({
  name = "mou__guanxing",
  derived_piles = "mou__guanxing_star",
})

Fk:loadTranslationTable{
  ["mou__guanxing"] = "观星",
  [":mou__guanxing"] = "准备阶段，你移去所有的“星”，并将牌堆顶的X张牌置于武将牌上"..
  "（X为7-此前此技能准备阶段发动次数的三倍），称为“星”，然后你可以将任意张“星”置于牌堆顶。"..
  "结束阶段，若你未于准备阶段将“星”置于牌堆顶，则你可以将任意张“星”置于牌堆顶。你可以如手牌般使用或打出“星”。",
  ["mou__guanxing_star"] = "星",

  ["$mou__guanxing1"] = "明星皓月，前路通达。",
  ["$mou__guanxing2"] = "冷夜孤星，正如时局啊。",
}

mouGuanxing:addEffect(fk.EventPhaseStart, {
  can_trigger = function(self, event, target, player, data)
    if target == player and player:hasSkill(self) then
      if player.phase == Player.Start then
        return #player:getPile("mou__guanxing_star") > 0 or player:getMark("mou__guanxing_times") < 3
      elseif player.phase == Player.Finish then
        return #player:getPile("mou__guanxing_star") > 0 and player:getMark("mou__guanxing-turn") > 0
      end
    end
  end,
  on_cost = Util.TrueFunc,
  on_use = function(self, event, target, player, data)
    ---@type string
    local skillName = mouGuanxing.name
    local room = player.room
    if player.phase == Player.Start then
      if #player:getPile("mou__guanxing_star") > 0 then
        room:moveCards({
          from = player,
          ids = player:getPile("mou__guanxing_star"),
          toArea = Card.DiscardPile,
          moveReason = fk.ReasonPutIntoDiscardPile,
          skillName = skillName,
          fromSpecialName = "mou__guanxing_star",
        })
        if not player:isAlive() then return false end
      end
      local n = 7 - 3 * player:getMark("mou__guanxing_times")
      if n < 1 then return false end
      room:addPlayerMark(player, "mou__guanxing_times")
      player:addToPile("mou__guanxing_star", room:getNCards(n), false, skillName)
      if not player:isAlive() or #player:getPile("mou__guanxing_star") == 0 then return false end
    end
    local result = room:askToGuanxing(
      player,
      {
        cards = player:getPile("mou__guanxing_star"),
        skill_name = skillName,
        skip = true,
        area_names = { "mou__guanxing_star", "Top" }
      }
    )
    if #result.bottom > 0 then
      room:moveCards({
        ids = table.reverse(result.bottom),
        from = player,
        fromArea = Card.PlayerSpecial,
        toArea = Card.DrawPile,
        moveReason = fk.ReasonJustMove,
        skillName = skillName,
        fromSpecialName = "mou__guanxing_star",
      })
      room:sendLog{
        type = "#GuanxingResult",
        from = player.id,
        arg = #result.bottom,
        arg2 = 0,
      }
    elseif player.phase == Player.Start then
      room:setPlayerMark(player, "mou__guanxing-turn", 1)
    end
  end,
})

mouGuanxing:addEffect("filter", {
  handly_cards = function (self, player)
    if player:hasSkill(mouGuanxing.name) then
      return player:getPile("mou__guanxing_star")
    end
  end,
})

mouGuanxing:addLoseEffect(function (self, player)
  player.room:setPlayerMark(player, "mou__guanxing_times", 0)
end)

return mouGuanxing
