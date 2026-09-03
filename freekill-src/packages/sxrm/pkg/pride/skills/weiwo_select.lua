local weiwoSelect = fk.CreateSkill {
  name = "#weiwo_select",
}

Fk:loadTranslationTable{
  ["#weiwo_select"] = "唯我",
}

weiwoSelect:addEffect("active", {
  card_num = 0,
  target_num = 1,
  interaction = function(self)
    return UI.ComboBox { choices = self.choices }
  end,
  card_filter = Util.FalseFunc,
  target_filter = function(self, player, to_select, selected)
    return to_select ~= player and not table.contains(self.exceptTargets or {}, to_select.id)
  end,
})

return weiwoSelect
