local yingbing = fk.CreateSkill {
  name = "yingbing",
}

Fk:loadTranslationTable{
  ["yingbing"] = "影兵",
  [":yingbing"] = "受到〖咒缚〗影响的角色进行判定时，你可以摸两张牌。",

  ["$yingbing1"] = "朱雀玄武，誓为我征。",
  ["$yingbing2"] = "所呼立至，所召立前。",
}

yingbing:addEffect(fk.AskForRetrial, {
  anim_type = "drawcard",
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(yingbing.name) and data.card.skillName == "zhoufu"
  end,
  on_use = function(self, event, target, player, data)
    player:drawCards(2, yingbing.name)
  end,
})

return yingbing
