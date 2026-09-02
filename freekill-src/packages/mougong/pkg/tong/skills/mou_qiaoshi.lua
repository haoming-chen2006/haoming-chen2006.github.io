local mouQiaoshi = fk.CreateSkill({
  name = "mou__qiaoshi",
})

Fk:loadTranslationTable{
  ["mou__qiaoshi"] = "樵拾",
  [":mou__qiaoshi"] = "每回合限一次，你受到其他角色造成的伤害后，伤害来源可以令你回复等同此次伤害值的体力，若如此做，该角色摸两张牌。",

  ["#mou__qiaoshi-invoke"] = "樵拾：你可以令%src回复%arg点体力，然后你摸两张牌",

  ["$mou__qiaoshi1"] = "拾樵城郭边，似有苔花开。",
  ["$mou__qiaoshi2"] = "拾樵采薇，怡然自足。",
}

mouQiaoshi:addEffect(fk.Damaged, {
  anim_type = "masochism",
  can_trigger = function(self, event, target, player, data)
    return
      target == player and
      player:hasSkill(mouQiaoshi.name) and
      player:usedSkillTimes(mouQiaoshi.name) == 0 and
      player:isWounded() and
      data.from and
      data.from ~= player and
      not data.from.dead
  end,
  on_cost = function(self, event, target, player, data)
    return
      data.from and
      not data.from.dead and
      player.room:askToSkillInvoke(
        data.from,
        {
          skill_name = mouQiaoshi.name,
          prompt = "#mou__qiaoshi-invoke:" .. player.id .. "::" .. data.damage
        }
      )
  end,
  on_use = function(self, event, target, player, data)
    ---@type string
    local skillName = mouQiaoshi.name
    local from = data.from
    if player:isWounded() then
      player.room:recover({
        who = player,
        num = math.min(data.damage, player:getLostHp()),
        recoverBy = from,
        skillName = skillName
      })
    end
    if from and not from.dead then
      from:drawCards(2, skillName)
    end
  end,
})

return mouQiaoshi
