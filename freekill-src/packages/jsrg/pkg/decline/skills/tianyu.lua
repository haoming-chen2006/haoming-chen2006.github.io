local tianyu = fk.CreateSkill {
  name = "js__tianyu",
}

Fk:loadTranslationTable{
  ["js__tianyu"] = "天予",
  [":js__tianyu"] = "当一张伤害牌或装备牌进入弃牌堆后，若此牌于本回合内未属于过任何角色，则你可以获得之。",

  ["#js__tianyu-prey"] = "天予：选择要获得的牌",
}

tianyu:addEffect(fk.AfterCardsMove, {
  anim_type = "drawcard",
  can_trigger = function(self, event, target, player, data)
    if not player:hasSkill(tianyu.name) then return end
    local ids = {}
    for _, move in ipairs(data) do
      if move.toArea == Card.DiscardPile then
        for _, info in ipairs(move.moveInfo) do
          if info.fromArea ~= Player.Hand and info.fromArea ~= Player.Equip then
            local card = Fk:getCardById(info.cardId)
            if (card.is_damage_card or card.type == Card.TypeEquip) and
              table.contains(player.room.discard_pile, info.cardId) then
              table.insertIfNeed(ids, info.cardId)
            end
          end
        end
      end
    end
    if #ids == 0 then return end

    player.room.logic:getEventsOfScope(GameEvent.MoveCards, 1, function (e)
      for _, move in ipairs(e.data) do
        if move.from then
          for _, info in ipairs(move.moveInfo) do
            if info.fromArea == Player.Hand or info.fromArea == Player.Equip then
              table.removeOne(ids, info.cardId)
            end
          end
        end
      end
      return #ids == 0
    end, Player.HistoryTurn)
    if #ids > 0 then
      event:setCostData(self, {cards = ids})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local all_cards = event:getCostData(self).cards
    local cards = room:askToChooseCards(player, {
      target = player,
      min = 1,
      max = #all_cards,
      flag = { card_data = {{ tianyu.name, all_cards }} },
      skill_name = tianyu.name,
      prompt = "#js__tianyu-prey",
    })
    if #cards > 0 then
      room:obtainCard(player, cards, true, fk.ReasonJustMove, player, tianyu.name)
    end
  end,
})

return tianyu
