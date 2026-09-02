local juelie = fk.CreateSkill {
  name = "re__juelie",
}

Fk:loadTranslationTable{
  ["re__juelie"] = "绝烈",
  [":re__juelie"] = "当你使用【杀】对目标角色造成伤害时，你可以令此伤害+X（X为你的手牌数与体力值中为全场唯一最小的项数）；"..
  "当你使用【杀】指定目标后，你可以弃置你一个区域内的任意张牌，然后弃置其此区域内至多等量的牌。",

  ["#re__juelie-invoke"] = "绝烈：是否令你对 %dest 造成的伤害+%arg？",
  ["#re__juelie-discard"] = "绝烈：你可以弃置一个区域里的任意张牌，然后弃置 %dest 此区域至多等量的牌",
}

juelie:addEffect(fk.DamageCaused, {
  anim_type = "offensive",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(juelie.name) and
      data.card and data.card.trueName == "slash" and player.room.logic:damageByCardEffect() and
      (table.every(player.room.alive_players, function(p)
        return p == player or p:getHandcardNum() > player:getHandcardNum()
      end) or
      table.every(player.room.alive_players, function(p)
        return p == player or p.hp > player.hp
      end))
  end,
  on_cost = function (self, event, target, player, data)
    local room = player.room
    local n = 0
    if table.every(room.alive_players, function(p)
      return p == player or p:getHandcardNum() > player:getHandcardNum()
    end) then
      n = n + 1
    end
    if table.every(player.room.alive_players, function(p)
      return p == player or p.hp > player.hp
    end) then
      n = n + 1
    end
    if room:askToSkillInvoke(player, {
      skill_name = juelie.name,
      prompt = "#re__juelie-invoke::"..data.to.id..":"..n,
    }) then
      event:setCostData(self, {tos = {data.to}, choice = n})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    data:changeDamage(event:getCostData(self).choice)
  end,
})

juelie:addEffect(fk.TargetSpecified, {
  anim_type = "offensive",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(juelie.name) and
      data.card.trueName == "slash" and not player:isNude()
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local success, dat = room:askToUseActiveSkill(player, {
      skill_name = "re__juelie_active",
      prompt = "#re__juelie-discard::"..data.to.id,
      cancelable = true,
    })
    if success and dat then
      event:setCostData(self, {tos = {data.to}, cards = dat.cards})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local cards = table.simpleClone(event:getCostData(self).cards)
    local flag
    for _, f in ipairs({"h", "e", "j"}) do
      if table.contains(player:getCardIds(f), cards[1]) then
        flag = f
        break
      end
    end
    room:throwCard(cards, juelie.name, player, player)
    if not (player.dead or data.to.dead or #data.to:getCardIds(flag) == 0) then
      cards = room:askToChooseCards(player, {
        target = data.to,
        min = 1,
        max = #cards,
        flag = flag,
        skill_name = juelie.name,
      })
      room:throwCard(cards, juelie.name, data.to, player)
    end
  end,
})

return juelie
