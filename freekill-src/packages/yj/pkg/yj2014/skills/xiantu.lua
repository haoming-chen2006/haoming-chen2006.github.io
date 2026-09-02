local xiantu = fk.CreateSkill {
  name = "xiantu",
}

Fk:loadTranslationTable{
  ["xiantu"] = "献图",
  [":xiantu"] = "其他角色的出牌阶段开始时，你可以摸两张牌，然后交给其两张牌，然后此阶段结束时，若其于此阶段内未杀死过角色，则你失去1点体力。",

  ["#xiantu-invoke"] = "献图：你可以摸两张牌并交给 %dest 两张牌",
  ["#xiantu-give"] = "献图：交给 %dest 两张牌",

  ["$xiantu1"] = "将军莫虑，且看此图。",
  ["$xiantu2"] = "我已诚心相献，君何踌躇不前？",
}

xiantu:addEffect(fk.EventPhaseStart, {
  mute = true,
  anim_type = "support",
  can_trigger = function(self, event, target, player, data)
    return target ~= player and player:hasSkill(xiantu.name) and target.phase == Player.Play and
      not target.dead
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    if room:askToSkillInvoke(player, {
      skill_name = xiantu.name,
      prompt = "#xiantu-invoke::"..target.id,
    }) then
      event:setCostData(self, {tos = {target}})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    player:broadcastSkillInvoke(xiantu.name, 1)
    room:notifySkillInvoked(player, xiantu.name, "support", {target})
    room:setPlayerMark(player, "xiantu_record-phase", 1)

    player:drawCards(2, xiantu.name)
    if player:isNude() or target == player then return end
    local cards = room:askToCards(player, {
      skill_name = xiantu.name,
      include_equip = true,
      min_num = 2,
      max_num = 2,
      prompt = "#xiantu-give::"..target.id,
      cancelable = false,
    })
    room:moveCardTo(cards, Player.Hand, target, fk.ReasonGive, xiantu.name, nil, false, player)
  end,
})

xiantu:addEffect(fk.EventPhaseEnd, {
  mute = true,
  is_delay_effect = true,
  can_trigger = function(self, event, target, player, data)
    return
      player:getMark("xiantu_record-phase") > 0 and
      player:isAlive() and
      #player.room.logic:getEventsOfScope(GameEvent.Death, 1, function(e)
        return e.data.killer == target
      end, Player.HistoryPhase) == 0
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    player:broadcastSkillInvoke("xiantu", 2)
    room:notifySkillInvoked(player, "xiantu", "negative")
    room:loseHp(player, 1, xiantu.name)
  end,
})

return xiantu
