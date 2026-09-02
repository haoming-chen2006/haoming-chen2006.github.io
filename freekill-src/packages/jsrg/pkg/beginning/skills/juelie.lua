local juelie = fk.CreateSkill {
  name = "juelie",
}

Fk:loadTranslationTable{
  ["juelie"] = "绝烈",
  [":juelie"] = "当你使用【杀】对目标角色造成伤害时，若你是手牌数最小或体力值最小的角色，则此伤害+1；当你使用【杀】指定目标后，"..
  "你可以弃置任意张牌，然后弃置其至多等量的牌。",

  ["#juelie-discard"] = "绝烈：你可以弃置任意张牌，然后弃置 %dest 至多等量的牌",

  ["$juelie1"] = "诸君放手，祸福，某一肩担之！",
  ["$juelie2"] = "先登破城，方不负孙氏勇烈！"
}

juelie:addEffect(fk.DamageCaused, {
  anim_type = "offensive",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(juelie.name) and
      data.card and data.card.trueName == "slash" and player.room.logic:damageByCardEffect() and
      (table.every(player.room.alive_players, function(p)
        return p:getHandcardNum() >= player:getHandcardNum()
      end) or
      table.every(player.room.alive_players, function(p)
        return p.hp >= player.hp
      end))
  end,
  on_cost = Util.TrueFunc,
  on_use = function(self, event, target, player, data)
    data:changeDamage(1)
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
    local cards = room:askToDiscard(player, {
      min_num = 1,
      max_num = 999,
      include_equip = true,
      skill_name = juelie.name,
      cancelable = true,
      prompt = "#juelie-discard::" .. data.to.id,
      skip = true,
    })
    if #cards > 0 then
      event:setCostData(self, {tos = {data.to}, cards = cards})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local cards = table.simpleClone(event:getCostData(self).cards)
    room:throwCard(cards, juelie.name, player, player)
    if not (player.dead or data.to.dead or data.to:isNude()) then
      cards = room:askToChooseCards(player, {
        target = data.to,
        min = 1,
        max = #cards,
        flag = "he",
        skill_name = juelie.name,
      })
      room:throwCard(cards, juelie.name, data.to, player)
    end
  end,
})

return juelie
