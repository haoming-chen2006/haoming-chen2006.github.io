local juelie_active = fk.CreateSkill {
  name = "re__juelie_active",
}

Fk:loadTranslationTable{
  ["re__juelie_active"] = "绝烈",
}

juelie_active:addEffect("active", {
  min_card_num = 1,
  target_num = 0,
  expand_pile = function (self, player)
    return player:getCardIds("j")
  end,
  card_filter = function (self, player, to_select, selected)
    if not player:prohibitDiscard(to_select) then
      if #selected == 0 then
        return true
      else
        return Fk:currentRoom():getCardArea(to_select) == Fk:currentRoom():getCardArea(selected[1])
      end
    end
  end,
})

return juelie_active
