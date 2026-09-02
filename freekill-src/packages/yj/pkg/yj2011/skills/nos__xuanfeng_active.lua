
local nos__xuanfeng_active = fk.CreateSkill {
  name = "nos__xuanfeng_active",
}

Fk:loadTranslationTable{
  ["nos__xuanfeng_active"] = "旋风",
}

nos__xuanfeng_active:addEffect("active", {
  interaction = UI.ComboBox {choices = {"nos__xuanfeng_slash", "nos__xuanfeng_damage"}},
  card_num = 0,
  min_target_num = 1,
  card_filter = Util.FalseFunc,
  target_filter = function(self, player, to_select, selected)
    if self.interaction.data == "nos__xuanfeng_slash" then
      local slash = Fk:cloneCard("slash")
      slash.skillName = "nos__xuanfeng"
      return slash.skill:targetFilter(player, to_select, selected, {}, slash, {bypass_distances = true, bypass_times = true})
    elseif self.interaction.data == "nos__xuanfeng_damage" then
      return #selected == 0 and player:distanceTo(to_select) == 1
    end
  end,
})

return nos__xuanfeng_active
