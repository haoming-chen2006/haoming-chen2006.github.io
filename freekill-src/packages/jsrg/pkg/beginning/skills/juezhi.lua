local juezhi = fk.CreateSkill {
  name = "juezhiq",
}

Fk:loadTranslationTable{
  ["juezhiq"] = "绝质",
  [":juezhiq"] = "当你不因废除装备栏而失去一张装备区里的装备牌后，你可以废除对应的装备栏；你回合内每阶段限一次，当你使用牌对目标角色造成伤害时，"..
  "其装备区里每有一张与你已废除装备栏对应的装备牌，此伤害便+1。",

  ["#juezhiq-invoke"] = "绝质：是否废除%arg？",
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
      prompt = "#juezhiq-invoke:::"..event:getCostData(self).choice,
    })
  end,
  on_use = function(self, event, target, player, data)
    player.room:abortPlayerArea(player, {event:getCostData(self).choice})
  end
})

juezhi:addEffect(fk.DamageCaused, {
  anim_type = "offensive",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(juezhi.name) and player.room.logic:damageByCardEffect() and
      #player.sealedSlots > 0 and table.find(data.to:getCardIds("e"), function(id)
        return table.contains(player.sealedSlots, Util.convertSubtypeAndEquipSlot(Fk:getCardById(id).sub_type))
      end) and
      player.room.current == player and player:usedEffectTimes(self.name, Player.HistoryPhase) == 0
  end,
  on_cost = Util.TrueFunc,
  on_use = function(self, event, target, player, data)
    local n = 0
    for _, id in ipairs(data.to:getCardIds("e")) do
      if table.contains(player.sealedSlots, Util.convertSubtypeAndEquipSlot(Fk:getCardById(id).sub_type)) then
        n = n + 1
      end
    end
    data:changeDamage(n)
  end,
})

return juezhi
