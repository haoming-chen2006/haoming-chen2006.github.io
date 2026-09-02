local baohe = fk.CreateSkill {
  name = "baohe",
}

Fk:loadTranslationTable{
  ["baohe"] = "暴喝",
  [":baohe"] = "一名角色出牌阶段结束时，你可以弃置两张牌，然后视为你对攻击范围内包含其的所有角色使用一张无距离限制的【杀】，"..
  "当其中一名目标响应此【杀】后，此【杀】对剩余目标造成的伤害+1。",

  ["#baohe-discard"] = "暴喝：你可以弃置两张牌，视为对所有攻击范围内包含 %dest 的角色使用【杀】",
}

baohe:addEffect(fk.EventPhaseEnd, {
  anim_type = "offensive",
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(baohe.name) and target.phase == Player.Play and
      #player:getCardIds("he") > 1 and not target.dead
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local cards = room:askToDiscard(player, {
      min_num = 2,
      max_num = 2,
      include_equip = true,
      skill_name = baohe.name,
      cancelable = true,
      prompt = "#baohe-discard::" .. target.id,
      skip = true,
    })
    if #cards > 1 then
      event:setCostData(self, {cards = cards})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    room:throwCard(event:getCostData(self).cards, baohe.name, player, player)
    if player.dead then return end
    local targets = table.filter(room:getOtherPlayers(player, false), function (p)
      return p:inMyAttackRange(target)
    end)
    if #targets > 0 then
      room:useVirtualCard("slash", nil, player, targets, baohe.name, true)
      for _, p in ipairs(room.players) do
        room:setPlayerMark(p, "baohe-tmp", 0)
      end
    end
  end,
})

baohe:addEffect(fk.DamageInflicted, {
  mute = true,
  is_delay_effect = true,
  can_trigger = function(self, event, target, player, data)
    return target == player and player.room.logic:damageByCardEffect() and
      table.contains(data.card.skillNames, baohe.name) and player:getMark("baohe-tmp") > 0
  end,
  on_use = function (self, event, target, player, data)
    data:changeDamage(player:getMark("baohe-tmp"))
  end,
})

baohe:addEffect(fk.CardEffectCancelledOut, {
  can_refresh = function(self, event, target, player, data)
    return target == player and table.contains(data.card.skillNames, baohe.name)
  end,
  on_refresh = function(self, event, target, player, data)
    local use_event = player.room.logic:getCurrentEvent():findParent(GameEvent.UseCard)
    if use_event then
      local use = use_event.data
      for _, p in ipairs(use.tos) do
        if p ~= data.to and not p.dead then
          player.room:addPlayerMark(p, "baohe-tmp", 1)
        end
      end
    end
  end,
})

return baohe
