local zhiheng = fk.CreateSkill({
  name = "mou__zhiheng",
})

Fk:loadTranslationTable{
  ["mou__zhiheng"] = "制衡",
  [":mou__zhiheng"] = "出牌阶段限一次，你可以弃置任意张牌，然后摸等量+X张牌（X为你牌数相等的区域数）。",

  ["#mou__zhiheng"] = "制衡：弃置任意张牌，摸等量+X张牌",

  ["$mou__zhiheng1"] = "稳坐山河，但观世变。",
  ["$mou__zhiheng2"] = "身处惊涛，尤可弄潮。",
}

zhiheng:addEffect("active", {
  anim_type = "drawcard",
  prompt = "#mou__zhiheng",
  min_card_num = 1,
  target_num = 0,
  can_use = function(self, player)
    return player:usedSkillTimes(zhiheng.name, Player.HistoryPhase) == 0
  end,
  card_filter = function(self, player, to_select, selected)
    return not player:prohibitDiscard(Fk:getCardById(to_select))
  end,
  on_use = function(self, room, effect)
    local player = effect.from
    room:throwCard(effect.cards, zhiheng.name, player, player)
    if player.dead then return end
    local nums = {}
    for _, area in ipairs({ "h", "e", "j" }) do
      table.insertIfNeed(nums, #player:getCardIds(area))
    end
    local n = #effect.cards
    if #nums == 1 then
      n = n + 3
    elseif #nums == 2 then
      n = n + 2
    end
    player:drawCards(n, zhiheng.name)
  end
})

return zhiheng
