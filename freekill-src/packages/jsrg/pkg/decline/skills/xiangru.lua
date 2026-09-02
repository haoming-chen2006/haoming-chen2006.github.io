local xiangru = fk.CreateSkill {
  name = "js__xiangru",
}

Fk:loadTranslationTable{
  ["js__xiangru"] = "相濡",
  [":js__xiangru"] = "当一名已受伤的其他角色/你受到致命伤害时，你/其他已受伤的角色可以交给伤害来源两张牌防止此伤害。",

  ["#xiangru-give"] = "相濡：是否交给 %dest 两张牌，防止 %src 受到的伤害？",
}

xiangru:addEffect(fk.DamageInflicted, {
  anim_type = "support",
  can_trigger = function(self, event, target, player, data)
    if player:hasSkill(xiangru.name) and data.from and not data.from.dead and data.damage >= (target.hp + target.shield) then
      if target ~= player then
        return target:isWounded() and #player:getCardIds("he") > 1 and player ~= data.from
      else
        return table.find(player.room:getOtherPlayers(player, false), function(p)
          return p:isWounded() and #p:getCardIds("he") > 1 and p ~= data.from
        end)
      end
    end
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    if target ~= player then
      local cards = room:askToCards(player, {
        min_num = 2,
        max_num = 2,
        include_equip = true,
        skill_name = xiangru.name,
        cancelable = true,
        prompt = "#xiangru-give:"..target.id..":"..data.from.id,
      })
      if #cards > 1 then
        event:setCostData(self, {tos = {target}, cards = cards, from = player})
        return true
      end
    else
      for _, p in ipairs(room:getOtherPlayers(player, false)) do
        if #p:getCardIds("he") > 1 and p:isWounded() and p ~= data.from then
          local cards = room:askToCards(p, {
            min_num = 2,
            max_num = 2,
            include_equip = true,
            skill_name = xiangru.name,
            cancelable = true,
            prompt = "#xiangru-give:"..player.id..":"..data.from.id,
          })
          if #cards > 1 then
            room:doIndicate(p, {player})
            event:setCostData(self, {cards = cards, from = p})
            return true
          end
        end
      end
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    data:preventDamage()
    room:obtainCard(data.from, event:getCostData(self).cards, false, fk.ReasonGive, event:getCostData(self).from, xiangru.name)
  end,
})

return xiangru
