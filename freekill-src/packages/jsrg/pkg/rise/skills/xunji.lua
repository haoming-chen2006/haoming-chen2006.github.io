local xunji = fk.CreateSkill {
  name = "xunjim",
}

Fk:loadTranslationTable{
  ["xunjim"] = "勋济",
  [":xunjim"] = "结束阶段，若你于本回合对回合内你使用牌指定过的其他角色均造成过伤害，你可以将弃牌堆中本回合造成伤害的牌分配给至多等量角色各一张。",

  ["#xunjim-give"] = "勋济：你可以分配这些牌，每名角色至多一张",

  ["$xunjim1"] = "天统之境，岂容丑虏犯边。",
  ["$xunjim2"] = "凉州有危，臣者当济。",
}

xunji:addEffect(fk.EventPhaseStart, {
  anim_type = "support",
  can_trigger = function(self, event, target, player, data)
    if target == player and player:hasSkill(xunji.name) and player.phase == Player.Finish then
      local room = player.room
      local targets = {}
      room.logic:getEventsOfScope(GameEvent.UseCard, 1, function (e)
        local use = e.data
        if use.from == player then
          for _, p in ipairs(use.tos) do
            if p ~= player then
              table.insertIfNeed(targets, p)
            end
          end
        end
      end, Player.HistoryTurn)
      if #targets == 0 then return end
      room.logic:getActualDamageEvents(1, function (e)
        local damage = e.data
        if damage.from == player then
          table.removeOne(targets, damage.to)
        end
      end, Player.HistoryTurn)
      if #targets > 0 then return end
      local cards = {}
      room.logic:getActualDamageEvents(1, function (e)
        local damage = e.data
        if damage.card then
          table.insertTableIfNeed(cards, Card:getIdList(damage.card))
        end
      end, Player.HistoryTurn)
      cards = table.filter(cards, function (id)
        return table.contains(room.discard_pile, id)
      end)
      if #cards > 0 then
        event:setCostData(self, {cards = cards})
        return true
      end
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local cards = table.simpleClone(event:getCostData(self).cards)
    room:askToYiji(player, {
      targets = room.alive_players,
      skill_name = xunji.name,
      min_num = 1,
      max_num = 10,
      prompt = "#xunjim-give",
      cards = cards,
      expand_pile = cards,
      single_max = 1,
    })
  end,
})

return xunji
