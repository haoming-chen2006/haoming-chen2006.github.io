local juezhi = fk.CreateSkill {
  name = "re__juezhiq",
}

Fk:loadTranslationTable{
  ["re__juezhiq"] = "绝质",
  [":re__juezhiq"] = "当你不因废除装备栏而失去一张装备区里的装备牌后，你可以废除对应的装备栏，然后摸两张牌；当一名角色于你的回合内受到伤害时，"..
  "若其装备区有与你已废除装备栏对应的装备牌，你可以令此伤害+1。",

  ["#re__juezhiq-invoke"] = "绝质：是否废除%arg并摸两张牌？",
  ["#re__juezhiq-damage"] = "绝质：是否令 %dest 受到的伤害+1？",
}

juezhi:addEffect(fk.AfterCardsMove, {
  anim_type = "special",
  can_trigger = function(self, event, target, player, data)
    if player:hasSkill(juezhi.name) then
      for _, move in ipairs(data) do
        if move.from == player and move.skillName ~= "gamerule_aborted" then
          for _, info in ipairs(move.moveInfo) do
            if info.fromArea == Card.PlayerEquip and
              #player:getAvailableEquipSlots(Fk:getCardById(info.cardId).sub_type) > 0 then
              return true
            end
          end
        end
      end
    end
  end,
  on_trigger = function(self, event, target, player, data)
    local subtypes = {}
    for _, move in ipairs(data) do
      if move.from == player then
        for _, info in ipairs(move.moveInfo) do
          if info.fromArea == Card.PlayerEquip then
            table.insert(subtypes, Fk:getCardById(info.cardId).sub_type)
          end
        end
      end
    end
    for _, subtype in ipairs(subtypes) do
      if not player:hasSkill(juezhi.name) then break end
      if #player:getAvailableEquipSlots(subtype) > 0 then
        event:setCostData(self, {choice = Util.convertSubtypeAndEquipSlot(subtype)})
        self:doCost(event, target, player, data)
      end
    end
  end,
  on_cost = function(self, event, target, player, data)
    return player.room:askToSkillInvoke(player, {
      skill_name = juezhi.name,
      prompt = "#re__juezhiq-invoke:::"..event:getCostData(self).choice,
    })
  end,
  on_use = function(self, event, target, player, data)
    player.room:abortPlayerArea(player, {event:getCostData(self).choice})
    if not player.dead then
      player:drawCards(2, juezhi.name)
    end
  end
})

juezhi:addEffect(fk.DamageInflicted, {
  anim_type = "offensive",
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(juezhi.name) and player.room.current == player and
      #player.sealedSlots > 0 and table.find(target:getCardIds("e"), function(id)
        return table.contains(player.sealedSlots, Util.convertSubtypeAndEquipSlot(Fk:getCardById(id).sub_type))
      end)
  end,
  on_cost = function (self, event, target, player, data)
    local room = player.room
    if room:askToSkillInvoke(player, {
      skill_name = juezhi.name,
      prompt = "#re__juezhiq-damage::"..target.id,
    }) then
      event:setCostData(self, {tos = {target}})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    data:changeDamage(1)
  end,
})

return juezhi
