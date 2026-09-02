local mumu_active = fk.CreateSkill {
  name = "mumu_active",
}

Fk:loadTranslationTable{
  ["mumu_active"] = "穆穆",
}

mumu_active:addEffect("active", {
  card_num = 0,
  target_num = 1,
  interaction = UI.ComboBox { choices = {"mumu_weapon", "mumu_armor"} },
  card_filter = Util.FalseFunc,
  target_filter = function(self, player, to_select, selected)
    if #selected == 0 then
      if self.interaction.data == "mumu_weapon" then
        return #to_select:getEquipments(Card.SubtypeWeapon) > 0
      elseif self.interaction.data == "mumu_armor" then
        return to_select ~= player and #to_select:getEquipments(Card.SubtypeArmor) > 0 and
          #player:getAvailableEquipSlots(Card.SubtypeArmor) > 0
      end
    end
  end,
})

return mumu_active
