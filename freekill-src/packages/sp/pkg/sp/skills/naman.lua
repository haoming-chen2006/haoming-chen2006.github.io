local naman = fk.CreateSkill {
  name = "naman",
}

Fk:loadTranslationTable{
  ["naman"] = "纳蛮",
  [":naman"] = "当其他角色打出的【杀】进入弃牌堆时，你可以获得之。",

  ["$naman1"] = "弃暗投明，光耀门楣！",
  ["$naman2"] = "慢着，让我来！",
}

naman:addEffect(fk.CardRespondFinished, {
  anim_type = "drawcard",
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(naman.name) and data.card.trueName == "slash" and data.from ~= player and
      player.room:getCardArea(data.card) == Card.Processing
  end,
  on_use = function(self, event, target, player, data)
    player.room:obtainCard(player, data.card, true, fk.ReasonJustMove, player, naman.name)
  end,
})

return naman
