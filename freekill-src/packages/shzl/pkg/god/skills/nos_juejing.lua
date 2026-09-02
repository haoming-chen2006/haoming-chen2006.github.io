local juejing = fk.CreateSkill {
  name = "nos__juejing",
  tags = {Skill.Compulsory},
}

Fk:loadTranslationTable{
  ["nos__juejing"] = "绝境",
  [":nos__juejing"] = "锁定技，摸牌阶段，你额外摸X张牌（X为你已损失的体力值）；你的手牌上限+2。",

  ["$nos__juejing1"] = "背水一战，不胜便死！",
  ["$nos__juejing2"] = "置于死地，方能后生！",
}

juejing:addEffect(fk.DrawNCards, {
  anim_type = "drawcard",
  on_use = function(self, event, target, player, data)
    data.n = data.n + player:getLostHp()
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
