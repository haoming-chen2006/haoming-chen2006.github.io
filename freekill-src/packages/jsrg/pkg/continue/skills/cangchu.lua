local cangchu = fk.CreateSkill {
  name = "js__cangchu",
}

Fk:loadTranslationTable{
  ["js__cangchu"] = "仓储",
  [":js__cangchu"] = "每名角色的结束阶段，你可以令至多X名角色各摸一张牌；若X大于存活角色数，则改为各摸两张牌（X为你此回合得到过的牌数）。",

  ["#js__cangchu-choose"] = "仓储：你可以令至多%arg名角色各摸%arg2张牌",
}

cangchu:addEffect(fk.EventPhaseStart, {
  anim_type = "support",
  can_trigger = function(self, event, target, player, data)
    if player:hasSkill(cangchu.name) and target.phase == Player.Finish then
      local n = 0
      local max_num = #player.room.alive_players
      player.room.logic:getEventsOfScope(GameEvent.MoveCards, 1, function(e)
        for _, move in ipairs(e.data) do
          if move.to == player and move.toArea == Card.PlayerHand then
            n = n + #move.moveInfo
          end
        end
        return n > max_num
      end, Player.HistoryTurn)
      if n > 0 then
        event:setCostData(self, {extra_data = n})
        return true
      end
    end
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local x, n = event:getCostData(self).extra_data, 1
    if x > #room.alive_players then
      x = #room.alive_players
      n = 2
    end
    local tos = room:askToChoosePlayers(player, {
      targets = room.alive_players,
      min_num = 1,
      max_num = x,
      skill_name = cangchu.name,
      cancelable = true,
      prompt = "#js__cangchu-choose:::"..x..":"..n,
    })
    if #tos > 0 then
      room:sortByAction(tos)
      event:setCostData(self, {tos = tos, num = n})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local num = event:getCostData(self).num
    for _, p in ipairs(event:getCostData(self).tos) do
      if not p.dead then
        p:drawCards(num, cangchu.name)
      end
    end
  end,
})

return cangchu
