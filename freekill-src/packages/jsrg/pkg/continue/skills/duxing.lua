local duxing = fk.CreateSkill {
  name = "duxing",
}

Fk:loadTranslationTable{
  ["duxing"] = "独行",
  [":duxing"] = "出牌阶段限一次，你可以视为使用一张以任意名角色为目标的【决斗】，直到此【决斗】结算完毕，所有目标的手牌均视为【杀】。",

  ["#duxing"] = "独行：视为使用一张指定任意个目标的【决斗】，结算中所有目标角色的手牌均视为【杀】！",

  ["$duxing1"] = "尔辈世族皆碌碌，千里函关我独行！",
  ["$duxing2"] = "江东英豪，可当我一人乎？",
}

duxing:addEffect("active", {
  anim_type = "offensive",
  prompt = "#duxing",
  card_num = 0,
  min_target_num = 1,
  max_target_num = 9,
  can_use = function(self, player)
    return player:usedSkillTimes(duxing.name, Player.HistoryPhase) == 0
  end,
  card_filter = Util.FalseFunc,
  target_filter = function(self, player, to_select, selected)
    local card = Fk:cloneCard("duel")
    card.skillName = duxing.name
    return card.skill:modTargetFilter(player, to_select, selected, card)
  end,
  on_use = function(self, room, effect)
    local player = effect.from
    local targets = table.simpleClone(effect.tos)
    for _, p in ipairs(targets) do
      room:setPlayerMark(p, "duxing-phase", 1)
      p:filterHandcards()
    end
    room:useVirtualCard("duel", nil, player, targets, duxing.name)
    for _, p in ipairs(targets) do
      room:setPlayerMark(p, "duxing-phase", 0)
      p:filterHandcards()
    end
  end,
})

duxing:addEffect("filter", {
  mute = true,
  card_filter = function(self, card, player)
    return player:getMark("duxing-phase") > 0 and table.contains(player:getCardIds("h"), card.id)
  end,
  view_as = function(self, player, card)
    return Fk:cloneCard("slash", card.suit, card.number)
  end,
})

return duxing
