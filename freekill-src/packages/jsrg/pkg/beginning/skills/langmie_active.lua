local langmie_active = fk.CreateSkill {
  name = "langmie_active",
}

Fk:loadTranslationTable{
  ["langmie_active"] = "狼灭",
  ["langmie_draw"] = "弃置一张牌，摸两张牌",
  ["langmie_damage"] = "弃置一张牌，对%dest造成1点伤害",
}

langmie_active:addEffect("active", {
  interaction = function (self, player)
    local all_choices = { "langmie_draw", "langmie_damage::"..Fk:currentRoom().current.id }
    local choices = {}
    for _, i in ipairs(self.choices) do
      table.insert(choices, all_choices[i])
    end
    return UI.ComboBox { choices = choices, all_choices = all_choices }
  end,
  card_num = 1,
  target_num = 0,
  card_filter = function (self, player, to_select, selected)
    return #selected == 0 and not player:prohibitDiscard(to_select)
  end,
})

return langmie_active
