local mouJingceSelect = fk.CreateSkill {
  name = "mou__jingce_select",
}

Fk:loadTranslationTable{
  ["mou__jingce_select"] = "精策",
  ["mou__jingce_gain"] = "选择获得角色",
  ["mou__jingce_nobody"] = "不被角色获得",
}

mouJingceSelect:addEffect("active", {
  anim_type = "defensive",
  expand_pile = "$mou__jingce",
  interaction = function()
    return UI.ComboBox { choices = { "mou__jingce_gain", "mou__jingce_nobody" } }
  end,
  can_use = Util.TrueFunc,
  card_num = 1,
  card_filter = function(self, player, to_select, selected)
    return table.contains(self.cards, to_select) and #selected == 0
  end,
  target_num = function(self)
    return self.interaction.data == "mou__jingce_gain" and 1 or 0
  end,
  target_filter = function(self, player, to_select, selected, selected_cards)
    if self.interaction.data == "mou__jingce_gain" then
      return #selected < 1
    end

    return false
  end,
})

return mouJingceSelect
