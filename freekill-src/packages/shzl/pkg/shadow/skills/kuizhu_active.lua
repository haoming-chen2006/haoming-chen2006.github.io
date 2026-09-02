local kuizhu_active = fk.CreateSkill {
  name = "kuizhu_active",
}

Fk:loadTranslationTable{
  ["kuizhu_active"] = "溃诛",
}

kuizhu_active:addEffect("active", {
  interaction = function(self, player)
    return UI.ComboBox { choices = { "kuizhu_choice1:::" .. self.num, "kuizhu_choice2:::" .. self.num }}
  end,
  card_num = 0,
  min_target_num = 1,
  card_filter = Util.FalseFunc,
  target_filter = function(self, player, to_select, selected)
    local data = self.interaction.data or ""
    if data:startsWith("kuizhu_choice1") then
      return #selected < self.num
    elseif data:startsWith("kuizhu_choice2") then
      local n = to_select.hp
      for _, p in ipairs(selected) do
        n = n + p.hp
      end
      return n <= self.num
    end
  end,
  feasible = function(self, player, selected, selected_cards)
    if #selected_cards ~= 0 or #selected == 0 or not self.interaction.data then return false end
    local data = self.interaction.data or ""
    if data:startsWith("kuizhu_choice1") then
      return #selected <= self.num
    else
      local n = 0
      for _, p in ipairs(selected) do
        n = n + p.hp
      end
      return n == self.num
    end
  end,
})

return kuizhu_active
