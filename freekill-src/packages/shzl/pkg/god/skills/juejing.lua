local juejing = fk.CreateSkill {
  name = "juejing",
  tags = {Skill.Compulsory},
}

Fk:loadTranslationTable{
  ["juejing"] = "绝境",
  [":juejing"] = "锁定技，你的手牌上限+2；当你进入濒死状态时或你的濒死结算结束后，你摸一张牌。",

  ["$juejing1"] = "绝望中，仍存有一线生机！",
  ["$juejing2"] = "还不可以认输！",
}

juejing:addEffect(fk.EnterDying, {
  anim_type = "drawcard",
  on_use = function(self, event, target, player, data)
    player:drawCards(1, juejing.name)
  end,
})
juejing:addEffect(fk.AfterDying, {
  anim_type = "drawcard",
  on_use = function(self, event, target, player, data)
    player:drawCards(1, juejing.name)
  end,
})
juejing:addEffect("maxcards", {
  correct_func = function(self, player)
    if player:hasSkill(juejing.name) then
      return 2
    end
  end,
})

return juejing
