
local kunfen = fk.CreateSkill {
  name = "kunfen",
  tags = { Skill.Compulsory },
}

Fk:loadTranslationTable{
  ["kunfen"] = "困奋",
  [":kunfen"] = "锁定技，结束阶段，你失去1点体力，然后摸两张牌。",

  ["$kunfen1"] = "纵使困顿难行，亦当砥砺奋进！",
  ["$kunfen2"] = "兴蜀需时，众将且勿惫怠！",
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
