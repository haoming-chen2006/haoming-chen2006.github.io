local zhenwei_active = fk.CreateSkill {
  name = "zhenwei_active",
}

Fk:loadTranslationTable{
  ["zhenwei_active"] = "镇卫",
}

zhenwei_active:addEffect("active", {
  card_num = 1,
  target_num = 0,
  interaction = function(self, player)
    return UI.ComboBox {
      choices = {
      "zhenwei_transfer:::"..self.card,
      "zhenwei_recycle::"..self.from..":"..self.card,
    },
  }
  end,
  card_filter = function (self, player, to_select, selected)
    return #selected == 0 and not player:prohibitDiscard(to_select)
  end,
})

return zhenwei_active
