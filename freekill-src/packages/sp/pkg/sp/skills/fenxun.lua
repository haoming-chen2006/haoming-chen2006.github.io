local fenxun = fk.CreateSkill {
  name = "sp__fenxun",
}

Fk:loadTranslationTable{
  ["sp__fenxun"] = "奋迅",
  [":sp__fenxun"] = "出牌阶段限一次，你可以弃置一张牌并选择一名其他角色，令你与其的距离视为1，直到回合结束。",

  ["#sp__fenxun"] = "奋迅：弃一张牌，你与一名角色的距离视为1直到回合结束",

  ["$sp__fenxun1"] = "取封侯爵赏，正在今日！",
  ["$sp__fenxun2"] = "给我拉过来！",
}

fenxun:addEffect("active", {
  anim_type = "offensive",
  card_num = 1,
  target_num = 1,
  prompt = "#sp__fenxun",
  can_use = function(self, player)
    return player:usedSkillTimes(fenxun.name, Player.HistoryPhase) == 0
  end,
  card_filter = function(self, player, to_select, selected)
    return #selected == 0 and not player:prohibitDiscard(to_select)
  end,
  target_filter = function(self, player, to_select, selected)
    return #selected == 0 and to_select ~= player
  end,
  on_use = function(self, room, effect)
    local player = effect.from
    room:addTableMarkIfNeed(player, "sp__fenxun-turn", effect.tos[1].id)
    room:throwCard(effect.cards, fenxun.name, player, player)
  end,
})

fenxun:addEffect("distance", {
  fixed_func = function(self, from, to)
    if table.contains(from:getTableMark("sp__fenxun-turn"), to.id) then
      return 1
    end
  end,
})

return fenxun
