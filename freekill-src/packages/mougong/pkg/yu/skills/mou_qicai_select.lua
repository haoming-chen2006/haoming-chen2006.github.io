local mouQicaiSelect = fk.CreateSkill({
  name = "mou__qicai_select",
})

Fk:loadTranslationTable{
  ["mou__qicai_select"] = "奇才",
}

mouQicaiSelect:addEffect("active", {
  expand_pile = function (self, player)
    local cards = Fk:currentRoom().discard_pile
    if Fk:currentRoom():isGameMode("1v2_mode") then
      return table.filter(cards, function(id)
        return Fk:getCardById(id).sub_type == Card.SubtypeArmor
      end)
    else
      return table.filter(cards, function(id)
        return Fk:getCardById(id).type == Card.TypeEquip
      end)
    end
  end,
  can_use = Util.FalseFunc,
  target_num = 0,
  card_num = 1,
  card_filter = function(self, player, to_select, selected)
    if #selected ~= 0 then return false end
    local card = Fk:getCardById(to_select)
    if
      Fk:currentRoom():isGameMode("1v2_mode") and
      (
        card.sub_type ~= Card.SubtypeArmor or
        table.contains(player:getTableMark("mou__qicai"), Fk:getCardById(to_select).trueName)
      )
    then
      return
    end

    return card.type == Card.TypeEquip and not table.contains(player:getCardIds("e"), to_select) and
      Fk:currentRoom():getPlayerById(self.mou__qicai_target):canMoveCardIntoEquip(to_select, false)
  end,
})

return mouQicaiSelect
