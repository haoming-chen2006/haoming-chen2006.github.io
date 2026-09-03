
local fubei_active = fk.CreateSkill {
  name = "#fubei_active",
}

Fk:loadTranslationTable{
  ["#fubei_active"] = "伏备",
}

fubei_active:addEffect("active", {
  card_num = 1,
  target_num = 0,
  interaction = UI.Spin { from = 1, to = 10 },
  card_filter = function(self, player, to_select, selected)
    return #selected == 0
  end,
})

return fubei_active
