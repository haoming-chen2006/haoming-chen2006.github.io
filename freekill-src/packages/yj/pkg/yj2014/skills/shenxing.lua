local shenxing = fk.CreateSkill {
  name = "shenxing",
}

Fk:loadTranslationTable{
  ["shenxing"] = "慎行",
  [":shenxing"] = "出牌阶段，你可以弃置两张牌，然后摸一张牌。",

  ["#shenxing"] = "慎行：弃置两张牌，摸一张牌",

  ["$shenxing1"] = "审时度势，乃容万变。",
  ["$shenxing2"] = "此需斟酌一二。",
}

shenxing:addEffect("active", {
  anim_type = "drawcard",
  prompt = "#shenxing",
  card_num = 2,
  target_num = 0,
  can_use = Util.TrueFunc,
  card_filter = function(self, player, to_select, selected)
    return #selected < 2 and not player:prohibitDiscard(to_select)
  end,
  on_use = function(self, room, effect)
    local player = effect.from
    room:throwCard(effect.cards, shenxing.name, player, player)
    if not player.dead then
      player:drawCards(1, shenxing.name)
    end
  end,
})

return shenxing
