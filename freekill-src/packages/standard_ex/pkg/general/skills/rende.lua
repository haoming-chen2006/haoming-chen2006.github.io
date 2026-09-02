
local rende = fk.CreateSkill{
  name = "ex__rende",
}

Fk:loadTranslationTable{
  ["ex__rende"] = "仁德",
  [":ex__rende"] = "出牌阶段每名角色限一次，你可以将任意张手牌交给一名其他角色，每阶段你以此法给出第二张牌时，你可以视为使用一张基本牌。",
  ["#ex__rende"] = "仁德：将任意张手牌交给一名角色，若此阶段交出达到两张，你可以视为使用一张基本牌",

  ["#ex__rende-ask"] = "仁德：你可视为使用一张基本牌",

  ["$ex__rende1"] = "同心同德，救困扶危！",
  ["$ex__rende2"] = "施仁布泽，乃我大汉立国之本！",
}

rende:addEffect("active", {
  anim_type = "support",
  min_card_num = 1,
  target_num = 1,
  prompt = "#ex__rende",
  card_filter = function(self, player, to_select, selected)
    return table.contains(player:getCardIds("h"), to_select)
  end,
  target_filter = function(self, player, to_select, selected)
    return #selected == 0 and to_select ~= player and not table.contains(player:getTableMark("ex__rende-phase"), to_select.id)
  end,
  on_use = function(self, room, effect)
    local player = effect.from
    local target = effect.tos[1]
    local cards = effect.cards
    room:addTableMark(player, "ex__rende-phase", target.id)
    local n = player:getMark("ex__rende_num-phase")
    room:moveCardTo(cards, Player.Hand, target, fk.ReasonGive, rende.name, nil, false, player)
    room:addPlayerMark(player, "ex__rende_num-phase", #cards)
    if n < 2 and n + #cards >= 2 then
      cards = room:getUniversalCards("b")
      local use = room:askToUseRealCard(player, {
        pattern = cards,
        skill_name = rende.name,
        prompt = "#ex__rende-ask",
        extra_data = {
          bypass_times = false,
          extraUse = false,
          expand_pile = cards,
        },
        cancelable = true,
        skip = true,
      })
      if use then
        local card = Fk:cloneCard(use.card.name)
        card.skillName = rende.name
        room:useCard{
          from = player,
          tos = use.tos,
          card = card,
        }
      end
    end
  end,
})

return rende
