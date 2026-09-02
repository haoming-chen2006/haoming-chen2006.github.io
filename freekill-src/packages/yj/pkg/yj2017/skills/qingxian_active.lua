local qingxian_active = fk.CreateSkill{
  name = "qingxian_active",
}

Fk:loadTranslationTable{
  ["qingxian_active"] = "清弦",
}

qingxian_active:addEffect("active", {
  card_num = 0,
  min_target_num = 0,
  max_target_num = 1,
  interaction = function()
    return UI.ComboBox { choices = { "qingxian_losehp", "qingxian_recover" } }
  end,
  card_filter = Util.FalseFunc,
  target_filter = function (self, player, to_select, selected, selected_cards)
    if self.qingxian then
      return false
    else
      return #selected == 0 and to_select ~= player
    end
  end,
  feasible = function (self, player, selected, selected_cards, card)
    if self.qingxian then
      return #selected == 0
    else
      return #selected == 1
    end
  end,
})

return qingxian_active
