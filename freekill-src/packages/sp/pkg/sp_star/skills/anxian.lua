local anxian = fk.CreateSkill {
  name = "anxian"
}

Fk:loadTranslationTable{
  ["anxian"] = "安娴",
  [":anxian"] = "每当你使用【杀】对目标角色造成伤害时，你可以防止此次伤害，令其弃置一张手牌，然后你摸一张牌；当你成为【杀】的目标时，"..
  "你可以弃置一张手牌使之无效，然后该【杀】的使用者摸一张牌。",

  ["#anxian1-invoke"] = "安娴：你可以防止对 %dest 造成的伤害，其弃置一张手牌，你摸一张牌",
  ["#anxian2-invoke"] = "安娴：你可以弃置一张手牌令%arg对你无效，%dest 摸一张牌",
}

anxian:addEffect(fk.DetermineDamageCaused, {
  anim_type = "control",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(anxian.name) and
      data.card and data.card.trueName == "slash" and
      player.room.logic:damageByCardEffect()
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    if room:askToSkillInvoke(player, {
      skill_name = anxian.name,
      prompt = "#anxian1-invoke::"..data.to.id,
    }) then
      event:setCostData(self, {tos = {data.to}})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    data:preventDamage()
    if not data.to:isKongcheng() then
      player.room:askToDiscard(data.to, {
        skill_name = anxian.name,
        include_equip = false,
        min_num = 1,
        max_num = 1,
        cancelable = false,
      })
    end
    if not player.dead then
      player:drawCards(1, anxian.name)
    end
  end,
})

anxian:addEffect(fk.TargetConfirming, {
  anim_type = "defensive",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(anxian.name) and
      data.card and data.card.trueName == "slash" and not player:isKongcheng()
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local card = room:askToDiscard(player, {
      skill_name = anxian.name,
      include_equip = false,
      min_num = 1,
      max_num = 1,
      prompt = "#anxian2-invoke::"..data.from.id..":"..data.card:toLogString(),
      cancelable = true,
      skip = true,
    })
    if #card > 0 then
      event:setCostData(self, {tos = {data.from}, cards = card})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    data.use.nullifiedTargets = data.use.nullifiedTargets or {}
    table.insertIfNeed(data.use.nullifiedTargets, player)
    room:throwCard(event:getCostData(self), anxian.name, player, player)
    if not data.from.dead then
      data.from:drawCards(1, anxian.name)
    end
  end,
})

return anxian
