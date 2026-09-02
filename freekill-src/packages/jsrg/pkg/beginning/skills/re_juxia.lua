local juxia = fk.CreateSkill {
  name = "re__juxia",
}

Fk:loadTranslationTable{
  ["re__juxia"] = "居下",
  [":re__juxia"] = "每回合限一次，当你成为其他角色使用牌的目标后，若其技能数大于你，你可以摸两张牌。",

  ["#re__juxia-invoke"] = "居下：你可以摸两张牌",
}

juxia:addEffect(fk.TargetConfirmed, {
  anim_type = "defensive",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(juxia.name) and
      data.from ~= player and
      #data.from:getSkillNameList() > #player:getSkillNameList() and
      player:usedSkillTimes(juxia.name, Player.HistoryTurn) == 0
  end,
  on_cost = function(self, event, target, player, data)
    return player.room:askToSkillInvoke(player, {
      skill_name = juxia.name,
      prompt = "#re__juxia-invoke",
    })
  end,
  on_use = function(self, event, target, player, data)
    player:drawCards(2, juxia.name)
  end,
})

return juxia
