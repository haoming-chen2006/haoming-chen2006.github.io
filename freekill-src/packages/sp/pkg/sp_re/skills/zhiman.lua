local zhiman = fk.CreateSkill {
  name = "zhiman",
}

Fk:loadTranslationTable{
  ["zhiman"] = "制蛮",
  [":zhiman"] = "当你对其他角色造成伤害时，你可以防止此伤害，然后获得其装备区或判定区的一张牌。",

  ["#zhiman-invoke"] = "制蛮：是否防止对 %dest 造成的伤害，获得其装备区或判定区一张牌？",

  ["$zhiman1"] = "兵法谙熟于心，取胜千里之外！",
  ["$zhiman2"] = "丞相多虑，且看我的！",
}

zhiman:addEffect(fk.DetermineDamageCaused, {
  anim_type = "control",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(zhiman.name) and data.to ~= player
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    if room:askToSkillInvoke(player, {
      skill_name = zhiman.name,
      prompt = "#zhiman-invoke::"..data.to.id,
    }) then
      event:setCostData(self, {tos = {data.to}})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    data:preventDamage()
    if #data.to:getCardIds("ej") > 0 then
      local card = room:askToChooseCard(player, {
        target = data.to,
        flag = "ej",
        skill_name = zhiman.name,
      })
      room:obtainCard(player, card, true, fk.ReasonPrey, player, zhiman.name)
    end
  end,
})

return zhiman
