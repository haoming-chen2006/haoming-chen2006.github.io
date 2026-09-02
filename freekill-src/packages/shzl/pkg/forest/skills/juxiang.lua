local juxiang = fk.CreateSkill {
  name = "juxiang",
  tags = { Skill.Compulsory },
}

Fk:loadTranslationTable{
  ["juxiang"] = "巨象",
  [":juxiang"] = "锁定技，【南蛮入侵】对你无效；其他角色使用的【南蛮入侵】结算结束后，你获得之。",

  ["$juxiang1"] = "大王，看我的。",
  ["$juxiang2"] = "小小把戏~",
}

juxiang:addEffect(fk.PreCardEffect, {
  anim_type = "defensive",
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(juxiang.name) and data.card.name == "savage_assault" and data.to == player
  end,
  on_use = function (self, event, target, player, data)
    data.nullified = true
  end,
})
juxiang:addEffect(fk.CardUseFinished, {
  anim_type = "drawcard",
  can_trigger = function(self, event, target, player, data)
    return target ~= player and player:hasSkill(juxiang.name) and player.room:getCardArea(data.card) == Card.Processing and
      data.card.name == "savage_assault"
  end,
  on_use = function(self, event, target, player, data)
    player.room:obtainCard(player, data.card, true, fk.ReasonJustMove, player, juxiang.name)
  end,
})

return juxiang
