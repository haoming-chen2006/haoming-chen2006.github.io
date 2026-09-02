Fk:loadTranslationTable{
  ["qiaomeng"] = "趫猛",
  [":qiaomeng"] = "当你使用的黑色【杀】对一名角色造成伤害后，你可以弃置其装备区里的一张牌。当此牌移至弃牌堆后，若此牌为坐骑牌，你获得此牌。",

  ["$qiaomeng1"] = "秣马厉兵，枕戈待战。",
  ["$qiaomeng2"] = "夺敌辎重，以为己用。",
}

local qiaomeng = fk.CreateSkill{
  name = "qiaomeng",
}

qiaomeng:addEffect(fk.Damage, {
  anim_type = "control",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(qiaomeng.name) and
      data.card and data.card.trueName == "slash" and
      not data.to.dead and #data.to:getCardIds("e") > 0 and data.card.color == Card.Black
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local cid = room:askToChooseCard(player, {
      target = data.to,
      flag = "e",
      skill_name = qiaomeng.name,
    })
    room:throwCard(cid, qiaomeng.name, data.to, player)
  end,
})

qiaomeng:addEffect(fk.AfterCardsMove, {
  mute = true,
  is_delay_effect = true,
  can_trigger = function(self, event, target, player, data)
    if not player.dead then
      for _, move in ipairs(data) do
        if move.toArea == Card.DiscardPile and move.moveReason == fk.ReasonDiscard and
          move.skillName == qiaomeng.name and move.proposer == player then
          for _, info in ipairs(move.moveInfo) do
            if (Fk:getCardById(info.cardId).sub_type == Card.SubtypeDefensiveRide or
              Fk:getCardById(info.cardId).sub_type == Card.SubtypeOffensiveRide) and
              table.contains(player.room.discard_pile, info.cardId) then
              return true
            end
          end
        end
      end
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local ids = {}
    for _, move in ipairs(data) do
      if move.toArea == Card.DiscardPile and move.moveReason == fk.ReasonDiscard and
        move.skillName == qiaomeng.name and move.proposer == player then
        for _, info in ipairs(move.moveInfo) do
          if (Fk:getCardById(info.cardId).sub_type == Card.SubtypeDefensiveRide or
            Fk:getCardById(info.cardId).sub_type == Card.SubtypeOffensiveRide) and
            table.contains(room.discard_pile, info.cardId) then
            table.insertIfNeed(ids, info.cardId)
          end
        end
      end
    end
    room:obtainCard(player, ids, true, fk.ReasonJustMove, player, qiaomeng.name)
  end,
})

return qiaomeng
