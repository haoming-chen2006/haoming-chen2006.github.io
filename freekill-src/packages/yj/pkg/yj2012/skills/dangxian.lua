local dangxian = fk.CreateSkill {
  name = "dangxian",
  tags = { Skill.Compulsory },
}

Fk:loadTranslationTable{
  ["dangxian"] = "当先",
  [":dangxian"] = "锁定技，回合开始时，你执行一个额外的出牌阶段。",

  ["$dangxian1"] = "先锋就由老夫来当！",
  ["$dangxian2"] = "看我先行破敌！",
}

dangxian:addEffect(fk.TurnStart, {
  anim_type = "offensive",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(dangxian.name)
  end,
  on_use = function(self, event, target, player, data)
    player:gainAnExtraPhase(Player.Play, dangxian.name)
  end,
})

return dangxian