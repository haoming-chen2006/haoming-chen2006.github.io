local mingzhe = fk.CreateSkill {
  name = "mingzhe",
}

Fk:loadTranslationTable{
  ["mingzhe"] = "明哲",
  [":mingzhe"] = "当你于回合外因使用、打出或弃置而失去一张红色牌时，你可以摸一张牌。",

  ["$mingzhe1"] = "明以洞察，哲以保身。",
  ["$mingzhe2"] = "塞翁失马，焉知非福？",
}

mingzhe:addEffect(fk.AfterCardsMove, {
  anim_type = "drawcard",
  trigger_times = function (self, event, target, player, data)
    local n = 0
    if player:hasSkill(mingzhe.name) and player.room.current ~= player then
      for _, move in ipairs(data) do
        if move.from == player and table.contains({fk.ReasonUse, fk.ReasonResponse, fk.ReasonDiscard}, move.moveReason) then
          for _, info in ipairs(move.moveInfo) do
            if (info.fromArea == Card.PlayerHand or info.fromArea == Card.PlayerEquip) and
              Fk:getCardById(info.cardId).color == Card.Red then
              n = n + 1
            end
          end
        end
      end
    end
    return n
  end,
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(mingzhe.name)
  end,
  on_use = function(self, event, target, player, data)
    player:drawCards(1, mingzhe.name)
  end,
})

return mingzhe
