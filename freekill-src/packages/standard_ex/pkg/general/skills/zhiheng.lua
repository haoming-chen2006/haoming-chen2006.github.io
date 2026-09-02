Fk:loadTranslationTable{
  ["ex__zhiheng"] = "制衡",
  [":ex__zhiheng"] = "出牌阶段限一次，你可以弃置任意张牌并摸等量的牌。若你以此法弃置了所有的手牌，你多摸一张牌。",

  ["#ex__zhiheng"] = "制衡：弃置任意张牌并摸等量的牌，若弃置了所有的手牌，你多摸一张牌",

  ["$ex__zhiheng1"] = "不急不躁，稳谋应对。",
  ["$ex__zhiheng2"] = "制衡互牵，大局可安。",
}

local zhiheng = fk.CreateSkill{
  name = "ex__zhiheng",
}

zhiheng:addEffect("active", {
  anim_type = "drawcard",
  min_card_num = 1,
  target_num = 0,
  prompt = "#ex__zhiheng",
  max_phase_use_time = 1,
  card_filter = function(self, player, to_select, selected)
    return not player:prohibitDiscard(to_select)
  end,
  on_use = function(self, room, effect)
    local player = effect.from
    local hand = player:getCardIds("h")
    local more = #hand > 0
    for _, id in ipairs(hand) do
      if not table.contains(effect.cards, id) then
        more = false
        break
      end
    end
    room:throwCard(effect.cards, zhiheng.name, player, player)
    if not player.dead then
      room:drawCards(player, #effect.cards + (more and 1 or 0), zhiheng.name)
    end
  end
})
return zhiheng
