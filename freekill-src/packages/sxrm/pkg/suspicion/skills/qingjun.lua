local qingjun = fk.CreateSkill {
  name = "qingjun",
}

Fk:loadTranslationTable{
  ["qingjun"] = "请君",
  [":qingjun"] = "每轮结束时，你可以指定一名其他角色，你和攻击范围内包含其的角色各摸两张牌并发动〖设伏〗，然后其执行一个额外回合。"..
  "此额外回合结束时：移去所有以此法放置的“伏兵”；未于本回合受到伤害的“设伏”角色依次视为对其使用一张【杀】。",

  ["#qingjun-choose"] = "请君：选择一名角色，你和攻击范围包含其的角色摸牌并发动“设伏”，其获得额外回合",
  ["#qingjun-shefu"] = "请君：%dest 即将执行额外回合，你需要发动“设伏”，若你此回合未受到伤害则视为对其使用【杀】",
}

qingjun:addEffect(fk.RoundEnd, {
  anim_type = "control",
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(qingjun.name) and #player.room:getOtherPlayers(player, false) > 0
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local to = room:askToChoosePlayers(player, {
      targets = room:getOtherPlayers(player, false),
      min_num = 1,
      max_num = 1,
      prompt = "#qingjun-choose",
      skill_name = qingjun.name,
      cancelable = true,
    })
    if #to > 0 then
      event:setCostData(self, {tos = to})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local to = event:getCostData(self).tos[1]
    local targets = {player}
    for _, p in ipairs(room:getAlivePlayers()) do
      if p:inMyAttackRange(to) then
        table.insert(targets, p)
      end
    end

    for _, p in ipairs(targets) do
      if not p.dead then
        p:drawCards(2, qingjun.name)
        if not p.dead and not p:isNude() then
          local cards = room:askToCards(p, {
            min_num = 1,
            max_num = 1,
            include_equip = true,
            skill_name = "sx__shefu&",
            prompt = "#qingjun-shefu::"..to.id,
            cancelable = false,
          })
          p:addToPile("$sx__shefu", cards, false, "sx__shefu&", p)
        end
      end
    end
    if not to.dead then
      room:setPlayerMark(to, qingjun.name, table.map(targets, Util.IdMapper))
      to:gainAnExtraTurn(false, qingjun.name)
      room:setPlayerMark(to, qingjun.name, 0)
    end
  end,
})

qingjun:addEffect(fk.TurnEnd, {
  anim_type = "offensive",
  is_delay_effect = true,
  can_trigger = function(self, event, target, player, data)
    return target == player and data.reason == qingjun.name
  end,
  on_use = function (self, event, target, player, data)
    local room = player.room
    local targets = table.map(player:getTableMark(qingjun.name), Util.Id2PlayerMapper)
    room:sortByAction(targets)
    for _, p in ipairs(targets) do
      if #p:getPile("$sx__shefu") > 0 then
        room:moveCardTo(p:getPile("$sx__shefu"), Card.DiscardPile, nil, fk.ReasonPutIntoDiscardPile, qingjun.name, nil, true, p)
      end
    end
    if player.dead then return end
    local record = {}
    room.logic:getActualDamageEvents(1, function (e)
      table.insertIfNeed(record, e.data.to)
    end, Player.HistoryTurn)
    for _, p in ipairs(targets) do
      if player.dead then return end
      if not p.dead and not table.contains(record, p) then
        room:useVirtualCard("slash", nil, p, player, qingjun.name, true)
      end
    end
  end,
})

qingjun:addAcquireEffect(function (self, player, is_start)
  player.room:addSkill("sx__shefu&")
end)

return qingjun
