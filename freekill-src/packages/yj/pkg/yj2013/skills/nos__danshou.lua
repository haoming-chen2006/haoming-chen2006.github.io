local danshou = fk.CreateSkill {
  name = "nos__danshou",
}

Fk:loadTranslationTable{
  ["nos__danshou"] = "胆守",
  [":nos__danshou"] = "每当你造成一次伤害后，你可以摸一张牌，若如此做，终止一切结算，当前回合结束。",

  ["$nos__danshou1"] = "到此为止了！",
  ["$nos__danshou2"] = "以胆为守，扼敌咽喉！",
}

danshou:addEffect(fk.Damage, {
  anim_type = "drawcard",
  on_use = function(self, event, target, player, data)
    player:drawCards(1, danshou.name)
    player.room.logic:breakTurn()
  end,
})

return danshou