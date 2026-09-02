local guizao = fk.CreateSkill {
  name = "guizao",
}

Fk:loadTranslationTable{
  ["guizao"] = "瑰藻",
  [":guizao"] = "弃牌阶段结束时，若你本阶段弃置过至少两张牌且花色均不相同，你可以回复1点体力或摸一张牌。",

  ["$guizao1"] = "这都是陛下的恩泽呀。",
  ["$guizao2"] = "陛下盛宠，臣万莫敢忘。",
}

guizao:addEffect(fk.EventPhaseEnd, {
  anim_type = "support",
  can_trigger = function(self, event, target, player, data)
    if target == player and player:hasSkill(guizao.name) and player.phase == Player.Discard then
      local yes, suits = true, {}
      player.room.logic:getEventsOfScope(GameEvent.MoveCards, 1, function(e)
        for _, move in ipairs(e.data) do
          if move.from == player and move.moveReason == fk.ReasonDiscard then
            for _, info in ipairs(move.moveInfo) do
              local suit = Fk:getCardById(info.cardId).suit
              if not table.contains(suits, suit) then
                table.insertIfNeed(suits, suit)
              elseif suit ~= Card.NoSuit then
                yes = false
                return true
              end
            end
          end
        end
      end, Player.HistoryPhase)
      return yes and #suits > 1
    end
  end,
  on_cost = function(self, event, target, player, data)
    local choices = {"draw1", "Cancel"}
    if player:isWounded() then
      table.insert(choices, 1, "recover")
    end
    local choice = player.room:askToChoice(player, {
      choices = choices,
      skill_name = guizao.name,
    })
    if choice ~= "Cancel" then
      event:setCostData(self, {choice = choice})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local choice = event:getCostData(self).choice
    if choice == "draw1" then
      player:drawCards(1, guizao.name)
    else
      player.room:recover{
        who = player,
        num = 1,
        recoverBy = player,
        skillName = guizao.name,
      }
    end
  end,
})

return guizao
