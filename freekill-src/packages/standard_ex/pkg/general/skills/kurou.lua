Fk:loadTranslationTable{
  ["ex__kurou"] = "苦肉",
  [":ex__kurou"] = "出牌阶段限一次，你可以弃置一张牌并失去1点体力。",

  ["#ex__kurou"] = "苦肉：你可以弃置一张牌并失去1点体力",

  ["$ex__kurou1"] = "我这把老骨头，不算什么！",
  ["$ex__kurou2"] = "为成大业，死不足惜！",
}

local kurou = fk.CreateSkill{
  name = "ex__kurou",
}

kurou:addEffect("active", {
  anim_type = "negative",
  card_num = 1,
  target_num = 0,
  prompt = "#ex__kurou",
  card_filter = function(self, player, to_select, selected)
    return #selected == 0 and not player:prohibitDiscard(to_select)
  end,
  can_use = function(self, player)
    return player:usedSkillTimes(kurou.name, Player.HistoryPhase) == 0
  end,
  on_use = function(self, room, effect)
    local from = effect.from
    room:throwCard(effect.cards, kurou.name, from, from)
    if not from.dead then
      room:loseHp(from, 1, kurou.name)
    end
  end,
})

return kurou
