local zhenlue = fk.CreateSkill {
  name = "zhenlue",
  tags = { Skill.Compulsory },
}

Fk:loadTranslationTable {
  ["zhenlue"] = "缜略",
  [":zhenlue"] = "锁定技，你使用的普通锦囊牌不能被抵消，你不能被选择为延时锦囊牌的目标。",
}

zhenlue:addEffect(fk.AfterCardUseDeclared, {
  anim_type = "control",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(zhenlue.name) and
      data.card:isCommonTrick()
  end,
  on_use = function(self, event, target, player, data)
    data.unoffsetableList = table.simpleClone(player.room.players)
  end,
})

zhenlue:addEffect("prohibit", {
  is_prohibited = function(self, from, to, card)
    return to:hasSkill(zhenlue.name) and card.sub_type == Card.SubtypeDelayedTrick
  end,
})

return zhenlue
