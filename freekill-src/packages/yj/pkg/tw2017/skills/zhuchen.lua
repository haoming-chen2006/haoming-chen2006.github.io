local zhuchen = fk.CreateSkill {
  name = "tw__zhuchen",
}

Fk:loadTranslationTable{
  ["tw__zhuchen"] = "诛綝",
  [":tw__zhuchen"] = "出牌階段，你可以棄置一張【桃】或【酒】並指定一名其他角色，此階段你至其距離視為1。",

  ["#tw__zhuchen"] = "诛綝：弃置一张【桃】或【酒】，本阶段至一名角色距离视为1",
}

zhuchen:addEffect("active", {
  anim_type = "offensive",
  prompt = "#tw__zhuchen",
  card_num = 1,
  target_num = 1,
  card_filter = function(self, player, to_select, selected)
    return #selected == 0 and table.contains({"peach", "analeptic"}, Fk:getCardById(to_select).trueName) and
      not player:prohibitDiscard(to_select)
  end,
  target_filter = function(self, player, to_select, selected)
    return #selected == 0 and to_select ~= player
  end,
  on_use = function(self, room, effect)
    local player = effect.from
    room:addTableMark(player, "tw__zhuchen-phase", effect.tos[1].id)
    room:throwCard(effect.cards, zhuchen.name, player, player)
  end,
})

zhuchen:addEffect("distance", {
  fixed_func = function(self, from, to)
    if table.contains(from:getTableMark("tw__zhuchen-phase"), to.id) then
      return 1
    end
  end,
})

return zhuchen
