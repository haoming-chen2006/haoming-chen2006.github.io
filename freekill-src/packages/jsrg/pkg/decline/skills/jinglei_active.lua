local jinglei_active = fk.CreateSkill {
  name = "js__jinglei_active",
}

Fk:loadTranslationTable{
  ["js__jinglei_active"] = "惊雷",
}

jinglei_active:addEffect("active", {
  card_num = 0,
  min_target_num = 1,
  card_filter = Util.FalseFunc,
  target_filter = function(self, player, to_select, selected)
    local n = to_select:getHandcardNum()
    for _, p in ipairs(selected) do
      n = n + p:getHandcardNum()
    end
    return n < self.js__jinglei_num
  end,
})

return jinglei_active
