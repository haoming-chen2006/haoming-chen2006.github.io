
local kunfen = fk.CreateSkill {
  name = "kunfenEx",
}

Fk:loadTranslationTable{
  ["kunfenEx"] = "困奋",
  [":kunfenEx"] = "结束阶段，你可以失去1点体力，然后摸两张牌。",

  ["$kunfenEx1"] = "纵使困顿难行，亦当砥砺奋进！",
  ["$kunfenEx2"] = "兴蜀需时，众将且勿惫怠！",
}

kunfen:addEffect(fk.EventPhaseStart, {
  anim_type = "drawcard",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(kunfen.name) and player.phase == Player.Finish
  end,
  on_use = function(self, event, target, player, data)
    player.room:loseHp(player, 1, kunfen.name)
    if not player.dead then
      player:drawCards(2, kunfen.name)
    end
  end,
})

return kunfen
