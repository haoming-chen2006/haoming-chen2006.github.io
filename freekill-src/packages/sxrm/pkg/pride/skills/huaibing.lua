local huaibing = fk.CreateSkill {
  name = "huaibing",
}

Fk:loadTranslationTable {
  ["huaibing"] = "怀兵",
  [":huaibing"] = [[准备阶段，你可以选择两名有手牌的角色，获得这些角色各一张手牌，然后你展示手牌，
  令其中体力值较少的角色下个摸牌阶段摸牌数、出牌阶段【杀】的使用次数、弃牌阶段手牌上限改为其中红色牌的数量。]],

  ["#huaibing-choose"] = "怀兵：你选择两名有手牌的角色，获得这些角色各一张手牌，然后你展示手牌",
  ["@huaibing_draw"] = "怀兵 摸",
  ["@huaibing_slash"] = "怀兵 杀",
  ["@huaibing_maxcards"] = "怀兵 弃",
}

huaibing:addEffect(fk.EventPhaseStart, {
  can_trigger = function(self, event, target, player, data)
    return
      target == player and
      data.phase == Player.Start and
      player:hasSkill(huaibing.name) and
      #table.filter(player.room.alive_players, function(p)
        return not p:isKongcheng()
      end) > 1
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room

    local targets = table.filter(room.alive_players, function(p)
      return not p:isKongcheng()
    end)

    if #targets <= 1 then
      return false
    end

    local tos = room:askToChoosePlayers(
      player,
      {
        min_num = 2,
        max_num = 2,
        targets = targets,
        skill_name = huaibing.name,
        prompt = "#huaibing-choose",
      }
    )

    if #tos > 0 then
      event:setCostData(self, { tos = tos })
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local tos = event:getCostData(self).tos
    if tos == nil or #tos == 0 then return end
    for _, p in ipairs(tos) do
      if p ~= player and p:isAlive() and not p:isKongcheng() then
        local cid = room:askToChooseCard(player, {
          target = p,
          flag = "h",
          skill_name = huaibing.name
        })
        room:obtainCard(player, cid, false, fk.ReasonPrey, player, huaibing.name)
      end
    end

    player:showCards(player:getCardIds("h"))
    local num = #table.filter(player:getCardIds("h"), function(cid) return Fk:getCardById(cid).color == Card.Red end)
    local to
    if tos[1].hp ~= tos[2].hp then
      table.sort(tos, function(a, b)
        return a.hp < b.hp
      end)
      to = tos[1]
      room:setPlayerMark(to, "@huaibing_draw", tostring(num))
      room:setPlayerMark(to, "@huaibing_slash", tostring(num))
      room:setPlayerMark(to, "@huaibing_maxcards", tostring(num))
    end
  end,
})

huaibing:addEffect(fk.EventPhaseEnd, {
  late_refresh = true,
  can_refresh = function(self, event, target, player, data)
    return target:getMark("@huaibing_maxcards") ~= 0 and data.phase == Player.Discard
  end,
  on_refresh = function(self, event, target, player, data)
    player.room:setPlayerMark(target, "@huaibing_maxcards", 0)
  end,
})

huaibing:addEffect(fk.DrawNCards, {
  mute = true,
  is_delay_effect = true,
  can_trigger = function(self, event, target, player, data)
    return target == player and player:getMark("@huaibing_draw") ~= 0
  end,
  on_use = function(self, event, target, player, data)
    data.n = tonumber(player:getMark("@huaibing_draw"))
    player.room:setPlayerMark(target, "@huaibing_draw", 0)
  end
})

huaibing:addEffect(fk.EventPhaseEnd, {
  late_refresh = true,
  can_refresh = function(self, event, target, player, data)
    return target:getMark("@huaibing_slash") ~= 0 and data.phase == Player.Play
  end,
  on_refresh = function(self, event, target, player, data)
    player.room:setPlayerMark(target, "@huaibing_slash", 0)
  end,
})

huaibing:addEffect("targetmod", {
  fix_times_func = function(self, player, skill, scope, card, to)
    return
      card and
      skill.trueName == "slash_skill" and
      scope == Player.HistoryPhase and
      player.phase == Player.Play and
      player:getMark("@huaibing_slash") ~= 0 and
      tonumber(player:getMark("@huaibing_slash")) or nil
  end
})

huaibing:addEffect("maxcards", {
  fixed_func = function(self, player)
    return
      player.phase == Player.Discard and
      player:getMark("@huaibing_maxcards") ~= 0 and
      tonumber(player:getMark("@huaibing_maxcards")) or nil
  end
})

return huaibing
