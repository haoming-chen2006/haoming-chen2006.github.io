local mouLianying = fk.CreateSkill({
  name = "mou__lianying",
  dynamic_desc = function (self, player, lang)
    if Fk:currentRoom():isGameMode("1v2_mode") then
      return "mou__lianying_1v2"
    else
      return "mou__lianying_not_1v2"
    end
  end,
})

Fk:loadTranslationTable{
  ["mou__lianying"] = "连营",
  [":mou__lianying"] = "其他角色的回合结束时，你可以观看牌堆顶X张牌，然后将这些牌分配给任意角色" ..
  "（X为你本回合失去过的牌数，若为斗地主模式则+1，且至多为5）。",

  [":mou__lianying_1v2"] = "其他角色的回合结束时，你可以观看牌堆顶X张牌，然后将这些牌分配给任意角色（X为你本回合失去过的牌数+1，且至多为5）。",
  [":mou__lianying_not_1v2"] = "其他角色的回合结束时，你可以观看牌堆顶X张牌，然后将这些牌分配给任意角色（X为你本回合失去过的牌数，且至多为5）。",

  ["$mou__lianying1"] = "蜀营连绵百里，正待吾燎原一炬！",
  ["$mou__lianying2"] = "蜀军虚实已知，吾等不日便破也！",
}

mouLianying:addEffect(fk.TurnEnd, {
  anim_type = "drawcard",
  can_trigger = function(self, event, target, player, data)
    return
      target ~= player and
      player:hasSkill(mouLianying.name) and
      (
        player.room:isGameMode("1v2_mode") or
        #player.room.logic:getEventsOfScope(GameEvent.MoveCards, 1, function(e)
          for _, move in ipairs(e.data) do
            if
              move.from == player and
              not (move.to == player and (move.toArea == Card.PlayerHand or move.toArea == Card.PlayerEquip))
            then
              return
                table.find(
                  move.moveInfo,
                  function(info) return info.fromArea == Card.PlayerHand or info.fromArea == Card.PlayerEquip end
                ) ~= nil
            end
          end

          return false
        end, Player.HistoryTurn) > 0
      )
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local sum = room:isGameMode("1v2_mode") and 1 or 0
    room.logic:getEventsOfScope(GameEvent.MoveCards, 1, function(e)
      for _, move in ipairs(e.data) do
        if
          move.from == player and
          not (move.to == player and (move.toArea == Card.PlayerHand or move.toArea == Card.PlayerEquip))
        then
          sum = sum + #table.filter(
            move.moveInfo,
            function(info) return info.fromArea == Card.PlayerHand or info.fromArea == Card.PlayerEquip end
          )

          if sum > 4 then
            return true
          end
        end
      end

      return false
    end, Player.HistoryTurn)

    sum = math.min(sum, 5)
    local ids = room:getNCards(sum)
    room:askToYiji(player, { min_num = sum, max_num = sum, cards = ids, skill_name = mouLianying.name, expand_pile = ids })
  end,
})

return mouLianying
