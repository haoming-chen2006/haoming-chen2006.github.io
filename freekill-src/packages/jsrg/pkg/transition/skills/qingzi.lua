local qingzi = fk.CreateSkill {
  name = "qingzi",
}

Fk:loadTranslationTable{
  ["qingzi"] = "轻辎",
  [":qingzi"] = "准备阶段，你可以弃置任意名其他角色装备区内的各一张牌，然后令这些角色获得〖神速〗直到你的下回合开始。",

  ["#qingzi-choose"] = "轻辎：弃置任意名角色各一张装备，这些角色直到你下回合开始获得“神速”",
}

qingzi:addEffect(fk.EventPhaseStart, {
  anim_type = "control",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(qingzi.name) and player.phase == Player.Start and
      table.find(player.room:getOtherPlayers(player, false), function(p)
        return #p:getCardIds("e") > 0
      end)
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local targets = table.filter(room:getOtherPlayers(player, false), function(p)
      return #p:getCardIds("e") > 0
    end)
    local tos = room:askToChoosePlayers(player, {
      min_num = 1,
      max_num = 9,
      targets = targets,
      skill_name = qingzi.name,
      prompt = "#qingzi-choose",
    })
    if #tos > 0 then
      room:sortByAction(tos)
      event:setCostData(self, {tos = tos})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    for _, p in ipairs(event:getCostData(self).tos) do
      if player.dead then return end
      if not p.dead and #p:getCardIds("e") > 0 then
        local c = room:askToChooseCard(player, {
          target = p,
          flag = "e",
          skill_name = qingzi.name,
        })
        room:throwCard(c, qingzi.name, p, player)
        if not p:hasSkill("ol_ex__shensu", true) and not p.dead then
          room:addTableMark(player, qingzi.name, p.id)
          room:handleAddLoseSkills(p, "ol_ex__shensu")
        end
      end
    end
  end,
})

local qingziClear = {
  can_refresh = function(self, event, target, player, data)
    return target == player and player:getMark(qingzi.name) ~= 0
  end,
  on_refresh = function(self, event, target, player, data)
    local room = player.room
    for _, id in ipairs(player:getMark(qingzi.name)) do
      local p = room:getPlayerById(id)
      room:handleAddLoseSkills(p, "-ol_ex__shensu")
    end
    room:setPlayerMark(player, qingzi.name, 0)
  end,
}

qingzi:addEffect(fk.TurnStart, qingziClear)

qingzi:addEffect(fk.BuryVictim, qingziClear)

return qingzi
