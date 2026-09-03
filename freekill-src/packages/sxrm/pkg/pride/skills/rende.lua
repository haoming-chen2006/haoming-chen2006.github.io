local rende = fk.CreateSkill {
  name = "sx__rende",
}

Fk:loadTranslationTable{
  ["sx__rende"] = "仁德",
  [":sx__rende"] = "出牌阶段，你可以将至少一张手牌交给魔关羽。你于本阶段内以此法给出的手牌首次达到两张或更多后，你回复1点体力。",

  ["#sx__rende-active"] = "发动 仁德，将至少一张手牌交给魔关羽",
}

rende:addEffect("active", {
  anim_type = "support",
  prompt = "#sx__rende-active",
  min_card_num = 1,
  target_num = 1,
  card_filter = function(self, player, to_select, selected)
    return table.contains(player:getCardIds("h"), to_select)
  end,
  target_filter = function(self, player, to_select, selected)
    return #selected == 0 and player:getMark("weiwo_owner_" .. self.name) == to_select.id
  end,
  on_use = function(self, room, effect)
    local target = effect.tos[1]
    local player = effect.from
    local cards = effect.cards
    local marks = player:getMark("sx__rende_cards-phase")
    room:moveCardTo(cards, Player.Hand, target, fk.ReasonGive, rende.name, nil, false, player)
    room:addPlayerMark(player, "sx__rende_cards-phase", #cards)
    if marks < 2 and marks + #cards >= 2 and not player.dead and player:isWounded() then
      room:recover{
        who = player,
        num = 1,
        recoverBy = player,
        skillName = rende.name,
      }
    end
  end,
})

return rende
