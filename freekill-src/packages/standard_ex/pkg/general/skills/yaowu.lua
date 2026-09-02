Fk:loadTranslationTable{
  ["yaowu"] = "耀武",
  [":yaowu"] = "锁定技，当你受到【杀】造成的伤害时，若此【杀】为红色，伤害来源回复1点体力或摸一张牌；若此【杀】不为红色，你摸一张牌。",

  ["$yaowu1"] = "大人有大量，不和你计较！",
  ["$yaowu2"] = "哼，先让你尝点甜头！",
}

local yaowu = fk.CreateSkill{
  name = "yaowu",
  tags = { Skill.Compulsory },
}

yaowu:addEffect(fk.DamageInflicted, {
  mute = true,
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(yaowu.name) and
      data.card and data.card.trueName == "slash" and
      (data.card.color ~= Card.Red or (data.from and not data.from.dead))
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    if data.card.color ~= Card.Red then
      room:notifySkillInvoked(player, yaowu.name, "masochism")
      player:broadcastSkillInvoke(yaowu.name, 1)
      player:drawCards(1, yaowu.name)
    else
      room:notifySkillInvoked(player, yaowu.name, "negative")
      player:broadcastSkillInvoke(yaowu.name, 2)
      local choices = {"draw1"}
      if data.from:isWounded() then
        table.insert(choices, "recover")
      end
      local choice = room:askToChoice(data.from, {
        choices = choices,
        skill_name = yaowu.name,
      })
      if choice == "recover" then
        room:recover({
          who = data.from,
          num = 1,
          recoverBy = data.from,
          skillName = yaowu.name,
        })
      else
        data.from:drawCards(1, yaowu.name)
      end
    end
  end,
})

return yaowu
