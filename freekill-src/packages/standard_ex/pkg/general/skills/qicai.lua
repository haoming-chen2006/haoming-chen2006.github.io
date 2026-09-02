Fk:loadTranslationTable{
  ["ex__qicai"] = "奇才",
  [":ex__qicai"] = "锁定技，你使用锦囊牌无距离限制；你装备区的宝物牌和防具牌不能被其他角色弃置。",
}

local qicai = fk.CreateSkill{
  name = "ex__qicai",
  tags = { Skill.Compulsory },
}

qicai:addEffect("targetmod", {
  bypass_distances = function(self, player, skill, card)
    return player:hasSkill(qicai.name) and card and card.type == Card.TypeTrick
  end,
})

qicai:addEffect(fk.BeforeCardsMove, {
  anim_type = "defensive",
  can_trigger = function(self, event, target, player, data)
    if not player:hasSkill(qicai.name) or
      (#player:getEquipments(Card.SubtypeArmor) == 0 and #player:getEquipments(Card.SubtypeTreasure) == 0) then return false end
    for _, move in ipairs(data) do
      if move.from == player and move.moveReason == fk.ReasonDiscard and move.proposer ~= player then
        for _, info in ipairs(move.moveInfo) do
          if info.fromArea == Card.PlayerEquip and
            table.contains({Card.SubtypeArmor, Card.SubtypeTreasure}, Fk:getCardById(info.cardId).sub_type) then
            return true
          end
        end
      end
    end
  end,
  on_use = function(self, event, target, player, data)
    local ids = {}
    for _, move in ipairs(data) do
      if move.from == player and move.moveReason == fk.ReasonDiscard and move.proposer ~= player then
        for _, info in ipairs(move.moveInfo) do
          if info.fromArea == Card.PlayerEquip and
            table.contains({Card.SubtypeArmor, Card.SubtypeTreasure}, Fk:getCardById(info.cardId).sub_type) then
            table.insertIfNeed(ids, info.cardId)
          end
        end
      end
    end
    player.room:cancelMove(data, ids)
  end,
})

return qicai
