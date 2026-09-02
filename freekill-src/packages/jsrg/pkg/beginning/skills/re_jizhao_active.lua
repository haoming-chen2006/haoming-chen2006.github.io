local jizhao_active = fk.CreateSkill {
  name = "re__jizhaoq_active",
}

Fk:loadTranslationTable{
  ["re__jizhaoq_active"] = "急召",
}

jizhao_active:addEffect("active", {
  interaction = UI.ComboBox { choices = {"basic", "trick", "equip"}},
  card_num = 0,
  target_num = 1,
  target_filter = function (self, player, to_select, selected, selected_cards)
    if #selected == 0 then
      if not to_select:isKongcheng() then
        return true
      else
        return table.find(Fk:currentRoom().alive_players, function (p)
          return to_select:canMoveCardsInBoardTo(p)
        end)
      end
    end
  end,
})

return jizhao_active
