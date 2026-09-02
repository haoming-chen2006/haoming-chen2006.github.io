local zongxuan = fk.CreateSkill {
  name = "zongxuan",
}

Fk:loadTranslationTable{
  ["zongxuan"] = "纵玄",
  [":zongxuan"] = "当你的牌因弃置而进入弃牌堆后，你可以将其中任意张牌置于牌堆顶。",

  ["$zongxuan1"] = "依易设象，以占吉凶。",
  ["$zongxuan2"] = "世间万物，皆有定数。",
}

zongxuan:addEffect(fk.AfterCardsMove, {
  can_trigger = function(self, event, target, player, data)
    if player:hasSkill(zongxuan.name) then
      for _, move in ipairs(data) do
        if move.from == player and move.toArea == Card.DiscardPile and move.moveReason == fk.ReasonDiscard then
          for _, info in ipairs(move.moveInfo) do
            if info.fromArea == Card.PlayerHand or info.fromArea == Card.PlayerEquip then
              if table.contains(player.room.discard_pile, info.cardId) then
                return true
              end
            end
          end
        end
      end
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local cards = {}
    for _, move in ipairs(data) do
      if move.from == player and move.toArea == Card.DiscardPile and move.moveReason == fk.ReasonDiscard then
        for _, info in ipairs(move.moveInfo) do
          if info.fromArea == Card.PlayerHand or info.fromArea == Card.PlayerEquip then
            if table.contains(room.discard_pile, info.cardId) then
              table.insertIfNeed(cards, info.cardId)
            end
          end
        end
      end
    end
    local top = room:askToGuanxing(player, {
      cards = cards,
      top_limit = {1, #cards},
      skill_name = zongxuan.name,
      skip = true,
      area_names = {"Top", "pile_discard"}
    }).top
    if #top > 0 then
      room:moveCards({
        ids = table.reverse(top),
        toArea = Card.DrawPile,
        moveReason = fk.ReasonPut,
        skillName = zongxuan.name,
        proposer = player,
      })
    end
  end,
})

return zongxuan
