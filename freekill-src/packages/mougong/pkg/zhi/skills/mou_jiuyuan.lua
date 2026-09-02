local mouJiuyuan = fk.CreateSkill({
  name = "mou__jiuyuan",
  tags = { Skill.Lord, Skill.Compulsory },
})

Fk:loadTranslationTable{
  ["mou__jiuyuan"] = "救援",
  [":mou__jiuyuan"] = "主公技，锁定技，其他吴势力角色使用【桃】时，你摸一张牌。其他吴势力角色对你使用【桃】回复的体力+1。",

  ["$mou__jiuyuan1"] = "汝救护有功，吾必当厚赐。",
  ["$mou__jiuyuan2"] = "诸位将军，快快拦住贼军！",
}

mouJiuyuan:addEffect(fk.PreHpRecover, {
  anim_type = "support",
  can_trigger = function(self, event, target, player, data)
    return
      target == player and
      player:hasSkill(mouJiuyuan.name) and
      data.card and
      data.card.trueName == "peach" and
      data.recoverBy and
      data.recoverBy.kingdom == "wu" and
      data.recoverBy ~= player
  end,
  on_use = function(self, event, target, player, data)
    data.num = data.num + 1
  end,
})

mouJiuyuan:addEffect(fk.CardUsing, {
  anim_type = "support",
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(mouJiuyuan.name) and target ~= player and target.kingdom == "wu" and data.card.trueName == "peach"
  end,
  on_use = function(self, event, target, player, data)
    player:drawCards(1, mouJiuyuan.name)
  end,
})

return mouJiuyuan
