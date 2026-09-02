local tijin = fk.CreateSkill {
  name = "tw__tijin",
}

Fk:loadTranslationTable{
  ["tw__tijin"] = "替巾",
  [":tw__tijin"] = "當其他角色使用【殺】指定唯一目標時，若你在其攻擊範圍內，你可以將此【殺】轉移給你。此【殺】結算後，你棄置使用者一張牌。",

  ["#tw__tijin-invoke"] = "替巾：你可以将 %src 对 %dest 使用的%arg转移给你，结算后弃置 %src 一张牌",
}

tijin:addEffect(fk.TargetSpecifying, {
  anim_type = "support",
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(tijin.name) and data.card.trueName == "slash" and
      target:inMyAttackRange(player) and data:isOnlyTarget(data.to) and data.to ~= player and
      not target:isProhibited(player, data.card) and not data.cancelled
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    if room:askToSkillInvoke(player, {
      skill_name = tijin.name,
      prompt = "#tw__tijin-invoke:"..data.from.id..":"..data.to.id..":"..data.card:toLogString(),
    }) then
      event:setCostData(self, {tos = {data.to}})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    if data:cancelCurrentTarget() then
      data:addTarget(player)
      data.extra_data = data.extra_data or {}
      data.extra_data.tw__tijin = player
    end
  end,
})

tijin:addEffect(fk.CardUseFinished, {
  anim_type = "control",
  is_delay_effect = true,
  can_trigger = function(self, event, target, player, data)
    return data.extra_data and data.extra_data.tw__tijin and
      data.extra_data.tw__tijin == player and not player.dead and
      not target.dead and not target:isKongcheng()
  end,
  on_cost = function(self, event, target, player, data)
    event:setCostData(self, {tos = {target}})
    return true
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local id = room:askToChooseCard(player, {
      target = target,
      flag = "he",
      skill_name = tijin.name,
    })
    room:throwCard(id, tijin.name, target, player)
  end,
})

return tijin
