local juxia = fk.CreateSkill {
  name = "juxia",
}

Fk:loadTranslationTable{
  ["juxia"] = "居下",
  [":juxia"] = "每回合限一次，当其他角色使用牌指定你为目标后，若其技能数大于你，则其可以令此牌对你无效，然后令你摸两张牌。",

  ["#juxia-invoke"] = "居下：你可以令%arg对 %src 无效并令其摸两张牌",
}

juxia:addEffect(fk.TargetSpecified, {
  anim_type = "defensive",
  can_trigger = function(self, event, target, player, data)
    return
      target ~= player and
      target:isAlive() and
      data.to == player and
      player:hasSkill(juxia.name) and
      #target:getSkillNameList() > #player:getSkillNameList() and
      player:usedSkillTimes(juxia.name, Player.HistoryTurn) == 0
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    if room:askToSkillInvoke(target, {
      skill_name = juxia.name,
      prompt = "#juxia-invoke:"..player.id.."::"..data.card:toLogString()
    }) then
      room:doIndicate(target, {player})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    data.use.nullifiedTargets = data.use.nullifiedTargets or {}
    table.insertIfNeed(data.use.nullifiedTargets, player)
    player:drawCards(2, juxia.name)
  end,
})

return juxia
