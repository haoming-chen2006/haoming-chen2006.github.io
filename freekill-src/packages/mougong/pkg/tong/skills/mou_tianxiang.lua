local mouTianxiang = fk.CreateSkill({
  name = "mou__tianxiang",
})

Fk:loadTranslationTable{
  ["mou__tianxiang"] = "天香",
  [":mou__tianxiang"] = "①出牌阶段限三次，你可将一张红色手牌交给一名没有“天香”标记的其他角色，并令其获得对应花色的“天香”标记。<br>"..
  "②当你受到伤害时，你可以选择一名拥有“天香”标记的其他角色，移除其“天香”标记，并根据移除的“天香”花色：<font color='red'>♥</font>，"..
  "你防止此伤害，然后令其受到防止伤害的来源角色造成的1点伤害；<font color='red'>♦</font>，其交给你两张牌。<br>"..
  "③准备阶段，若场上有“天香”标记，你移除场上所有“天香”标记，并摸等量的牌（若为2V2模式则额外摸两张）。",
  ["#mou__tianxiang-choose"] = "天香：移除一名角色的“天香”标记，并按“天香”花色发动效果",
  ["#mou__tianxiang-give"] = "天香：请交给 %dest 两张牌",
  ["@mou__tianxiang"] = "天香",
  ["#mou__tianxiang"] = "天香：将红色手牌交给其他角色，你下次受伤时：<font color='red'>♥</font>：令其受伤；<font color='red'>♦</font>，其交给你两张牌",

  ["$mou__tianxiang1"] = "凤眸流盼，美目含情。",
  ["$mou__tianxiang2"] = "灿如春华，皎如秋月。",
}

mouTianxiang:addEffect("active", {
  anim_type = "control",
  card_num = 1,
  target_num = 1,
  prompt = "#mou__tianxiang",
  card_filter = function(self, player, to_select, selected)
    return #selected == 0 and Fk:getCardById(to_select).color == Card.Red and table.contains(player:getCardIds("h"), to_select)
  end,
  target_filter = function(self, player, to_select, selected, selected_cards)
    return
      #selected == 0 and
      player ~= to_select and
      #selected_cards == 1 and
      to_select:getMark("@mou__tianxiang") == 0
  end,
  times = function(self, player)
    return player.phase == Player.Play and 3 - player:usedEffectTimes(self.name, Player.HistoryPhase) or -1
  end,
  can_use = function(self, player)
    return player:usedEffectTimes(self.name, Player.HistoryPhase) < 3
  end,
  on_use = function(self, room, effect)
    local player = effect.from
    local to = effect.tos[1]
    local card = Fk:getCardById(effect.cards[1])
    local suit = card:getSuitString(true)
    room:moveCardTo(card, Player.Hand, to, fk.ReasonGive, self.name, nil, true, player.id)
    if not to.dead then
      room:setPlayerMark(to, "@mou__tianxiang", suit)
    end
  end,
})

mouTianxiang:addEffect(fk.DetermineDamageInflicted, {
  can_trigger = function(self, event, target, player, data)
    return
      player:hasSkill(mouTianxiang.name) and
      target == player and
      table.find(player.room.alive_players, function(p) return p:getMark("@mou__tianxiang") ~= 0 end)
  end,
  on_cost = function (self, event, target, player, data)
    local room = player.room
    local targets = table.filter(room.alive_players, function(p) return p :getMark("@mou__tianxiang") ~= 0 end)
    if #targets == 0 then return false end
    local tos = player.room:askToChoosePlayers(
      player,
      {
        targets = targets,
        min_num = 1,
        max_num = 1,
        prompt = "#mou__tianxiang-choose",
        skill_name = mouTianxiang.name,
        cancelable = true
      }
    )
    if #tos > 0 then
      event:setCostData(self, { tos = tos })
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    ---@type string
    local skillName = mouTianxiang.name
    local room = player.room
    local to = event:getCostData(self).tos[1]
    local suit = to:getMark("@mou__tianxiang")
    room:setPlayerMark(to, "@mou__tianxiang", 0)
    if suit == "log_heart" then
      data:preventDamage()
      room:damage { from = data.from, to = to, damage = 1, skillName = skillName}
    elseif not to:isNude() then
      local cards = #to:getCardIds("he") < 3 and to:getCardIds("he") or
      room:askToCards(
        to,
        {
          min_num = 2,
          max_num = 2,
          include_equip = true,
          skill_name = skillName,
          cancelable = false, 
          pattern = ".",
          prompt = "#mou__tianxiang-give::" .. player.id
        }
      )
      room:moveCardTo(cards, Player.Hand, player, fk.ReasonGive, skillName, nil, false, to.id)
    end
  end,
})

mouTianxiang:addEffect(fk.EventPhaseStart, {
  can_trigger = function(self, event, target, player, data)
    return
      player:hasSkill(mouTianxiang.name) and
      target == player and
      table.find(player.room.alive_players, function(p) return p:getMark("@mou__tianxiang") ~= 0 end) and
      player.phase == Player.Start
  end,
  on_cost = Util.TrueFunc,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local n = 0
    for _, p in ipairs(room.alive_players) do
      if p:getMark("@mou__tianxiang") ~= 0 then
        room:setPlayerMark(p, "@mou__tianxiang", 0)
        n = n + 1
      end
    end
    if room:isGameMode("2v2_mode") then
      n = n + 2
    end
    player:drawCards(n, "mou__tianxiang")
  end,
})

return mouTianxiang
