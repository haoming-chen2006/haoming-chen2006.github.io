local mouYaowu = fk.CreateSkill({
  name = "mou__yaowu",
  tags = { Skill.Compulsory },
})

Fk:loadTranslationTable{
  ["mou__yaowu"] = "耀武",
  [":mou__yaowu"] = "锁定技，当你受到【杀】造成的伤害时，若此【杀】：为红色，伤害来源选择回复1点体力或摸一张牌；不为红色，你摸一张牌。",

  ["$mou__yaowu1"] = "俞涉小儿，岂是我的对手！",
  ["$mou__yaowu2"] = "上将潘凤？哼！还不是死在我刀下！",
}

mouYaowu:addEffect(fk.DamageInflicted, {
  mute = true,
  can_trigger = function(self, event, target, player, data)
    return
      target == player and
      player:hasSkill(mouYaowu.name) and
      data.card and
      data.card.trueName == "slash" and
      (data.card.color ~= Card.Red or data.from)
  end,
  on_use = function(self, event, target, player, data)
    ---@type string
    local skillName = mouYaowu.name
    local room = player.room
    player:broadcastSkillInvoke(skillName)
    if data.card.color ~= Card.Red then
      room:notifySkillInvoked(player, skillName, "drawcard")
      player:drawCards(1, skillName)
    else
      room:notifySkillInvoked(player, skillName, "negative")
      local from = data.from
      if not (from and from:isAlive()) then
        return false
      end

      local choices = { "draw1" }
      if from:isWounded() then
        table.insert(choices, "recover")
      end
      if room:askToChoice(from, { choices = choices, skill_name = skillName }) == "recover" then
        room:recover({ who = from, num = 1, recoverBy = from, skillName = skillName })
      else
        from:drawCards(1, skillName)
      end
    end
  end,
})

return mouYaowu
