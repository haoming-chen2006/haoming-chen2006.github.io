local lieren = fk.CreateSkill {
  name = "lieren",
}

Fk:loadTranslationTable{
  ["lieren"] = "烈刃",
  [":lieren"] = "当你使用【杀】对目标角色造成伤害后，你可以与其拼点，若你赢，你获得其一张牌。",

  ["#lieren-invoke"] = "烈刃：你可以与 %dest 拼点，若你赢，你获得其一张牌。",

  ["$lieren1"] = "亮兵器吧。",
  ["$lieren2"] = "尝尝我飞刀的厉害！",
}

lieren:addEffect(fk.Damage, {
  anim_type = "offensive",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(lieren.name) and data.card and data.card.trueName == "slash" and
      not data.to.dead and player:canPindian(data.to) and not data.chain
      and player.room.logic:damageByCardEffect()
  end,
  on_cost = function (self, event, target, player, data)
    if player.room:askToSkillInvoke(player, {
      skill_name = lieren.name,
      prompt = "#lieren-invoke::"..data.to.id,
    }) then
      event:setCostData(self, { tos = { data.to } })
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local pindian = player:pindian({ data.to }, lieren.name)
    if pindian.results[data.to].winner == player then
      if player.dead or data.to.dead or data.to:isNude() then return end
      local card = room:askToChooseCard(player, {
        skill_name = lieren.name,
        target = data.to,
        flag = "he",
      })
      room:obtainCard(player, card, false, fk.ReasonPrey, player, lieren.name)
    end
  end,
})

return lieren
