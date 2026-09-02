local zhiti = fk.CreateSkill {
  name = "zhiti",
  tags = {Skill.Compulsory},
}

Fk:loadTranslationTable{
  ["zhiti"] = "止啼",
  [":zhiti"] = "锁定技，你攻击范围内已受伤的角色手牌上限-1；当你和这些角色拼点或【决斗】你赢时，你恢复一个装备栏。"..
  "当你受到伤害后，若来源在你的攻击范围内且已受伤，你恢复一个装备栏。",

  ["#zhiti-choice"] = "止啼：选择要恢复的装备栏",

  ["$zhiti1"] = "江东小儿，安敢啼哭？",
  ["$zhiti2"] = "娃闻名止啼，孙损十万休。",
}

local zhiti_on_use = function(self, event, target, player, data)
  local room = player.room
  local all_slots = {"WeaponSlot", "ArmorSlot", "DefensiveRideSlot", "OffensiveRideSlot", "TreasureSlot"}
  local choices = {}
  for _, equip_slot in ipairs(all_slots) do
    if table.contains(player.sealedSlots, equip_slot) then
      table.insert(choices, equip_slot)
    end
  end
  if #choices > 0 then
    local choice = room:askToChoice(player, {
      choices = choices,
      skill_name = zhiti.name,
      prompt = "#zhiti-choice",
    })
    room:resumePlayerArea(player, {choice})
  end
end

zhiti:addEffect(fk.Damage, {
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(zhiti.name) and
      table.find(player.sealedSlots, function(slot_name)
        return slot_name ~= Player.JudgeSlot
      end) and
      data.card and data.card.trueName == "duel" and
      data.to:isWounded() and player:inMyAttackRange(data.to)
  end,
  on_use = zhiti_on_use,
})
zhiti:addEffect(fk.Damaged, {
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(zhiti.name) and
      table.find(player.sealedSlots, function(slot_name)
        return slot_name ~= Player.JudgeSlot
      end) and
      data.from and data.from:isWounded() and player:inMyAttackRange(data.from)
  end,
  on_use = zhiti_on_use,
})
zhiti:addEffect(fk.PindianResultConfirmed, {
  can_trigger = function(self, event, target, player, data)
    if target == player and player:hasSkill(zhiti.name) and
      table.find(player.sealedSlots, function(slot_name)
        return slot_name ~= Player.JudgeSlot
      end) then
      if data.winner == player then
        if player == data.from then
          return data.to:isWounded() and player:inMyAttackRange(data.to)
        else
          return data.from:isWounded() and player:inMyAttackRange(data.from)
        end
      end
    end
  end,
  on_use = zhiti_on_use,
})
zhiti:addEffect("maxcards", {
  correct_func = function(self, player)
    if not player:isWounded() then return 0 end
    return - #table.filter(Fk:currentRoom().alive_players, function(p)
      return p:hasSkill(zhiti.name) and p:inMyAttackRange(player) end
    )
  end,
})

return zhiti
