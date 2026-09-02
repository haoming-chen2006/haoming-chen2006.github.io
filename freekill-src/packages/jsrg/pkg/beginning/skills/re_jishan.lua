local jishan = fk.CreateSkill {
  name = "re__jishan",
}

Fk:loadTranslationTable{
  ["re__jishan"] = "积善",
  [":re__jishan"] = "每回合各限一次：当一名角色受到伤害时，你可以失去1点体力防止此伤害，然后令你或其摸一张牌；当你造成伤害后，"..
  "你可以令一名你对其发动过〖积善〗的其他角色回复1点体力。",

  ["#re__jishan-invoke"] = "积善：你可以失去1点体力防止 %dest 受到的伤害，然后你或其摸一张牌",
  ["#re__jishan-draw"] = "积善：令你或其摸一张牌",
  ["#re__jishan-choose"] = "积善：你可以令一名角色回复1点体力",
}

jishan:addEffect(fk.DamageInflicted, {
  anim_type = "support",
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(jishan.name) and player:usedEffectTimes(self.name, Player.HistoryTurn) == 0
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    if room:askToSkillInvoke(player, {
      skill_name = jishan.name,
      prompt = "#re__jishan-invoke::"..target.id,
    }) then
      event:setCostData(self, {tos = {target}})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    data:preventDamage()
    if target ~= player then
      room:addTableMarkIfNeed(player, "re__jishan_record", target.id)
    end
    room:loseHp(player, 1, jishan.name)
    if player.dead then return end
    local to = {player}
    if not target.dead then
      table.insertIfNeed(to, target)
    end
    if #to > 1 then
      to = room:askToChoosePlayers(player, {
        min_num = 1,
        max_num = 1,
        targets = to,
        skill_name = jishan.name,
        prompt = "#re__jishan-draw",
        cancelable = false,
        no_indicate = true,
      })
    end
    to[1]:drawCards(1, jishan.name)
  end,
})

jishan:addEffect(fk.Damage, {
  anim_type = "support",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(jishan.name) and
      player:usedEffectTimes(self.name, Player.HistoryTurn) == 0 and
      table.find(player.room.alive_players, function(to)
        return table.contains(player:getTableMark("re__jishan_record"), to.id) and to:isWounded()
      end)
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local targets = table.filter(room.alive_players, function(to)
      return table.contains(player:getTableMark("re__jishan_record"), to.id) and to:isWounded()
    end)
    local to = room:askToChoosePlayers(player, {
      targets = targets,
      min_num = 1,
      max_num = 1,
      prompt = "#re__jishan-choose",
      skill_name = jishan.name,
      cancelable = true,
    })
    if #to > 0 then
      event:setCostData(self, {tos = to})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    player.room:recover{
      who = event:getCostData(self).tos[1],
      num = 1,
      recoverBy = player,
      skillName = jishan.name,
    }
  end,
})

return jishan
