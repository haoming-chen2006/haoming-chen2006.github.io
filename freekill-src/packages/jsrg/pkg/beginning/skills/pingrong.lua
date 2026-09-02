local pingrong = fk.CreateSkill {
  name = "pingrong",
}

Fk:loadTranslationTable{
  ["pingrong"] = "平戎",
  [":pingrong"] = "每轮限一次，一名角色的结束阶段，你可以选择一名有“猎”的角色移去其“猎”，然后获得一个额外的回合，此回合的结束阶段，"..
  "若你于此回合内未造成过伤害，你失去1点体力。",

  ["#pingrong-choose"] = "平戎：你可以移去一名角色的“猎”标记，获得一个额外回合",

  ["$pingrong1"] = "万里平戎，岂曰功名，孤心昭昭鉴日月。",
  ["$pingrong2"] = "四极倾颓，民心思定，试以只手补天裂。",
}

pingrong:addEffect(fk.EventPhaseStart, {
  anim_type = "offensive",
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(pingrong.name) and target.phase == Player.Finish and
      player:usedSkillTimes(pingrong.name, Player.HistoryRound) == 0 and
      table.find(player.room.alive_players, function (p)
        return p:getMark("@@caocao_lie") > 0
      end)
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local targets = table.filter(room.alive_players, function(p)
      return p:getMark("@@caocao_lie") > 0
    end)
    local to = room:askToChoosePlayers(player, {
      targets = targets,
      min_num = 1,
      max_num = 1,
      prompt = "#pingrong-choose",
      skill_name = pingrong.name,
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
    room:setPlayerMark(to, "@@caocao_lie", 0)
    player:gainAnExtraTurn(true, pingrong.name)
  end,
})

pingrong:addEffect(fk.EventPhaseStart, {
  anim_type = "negative",
  is_delay_effect = true,
  can_trigger = function(self, event, target, player, data)
    if target == player and player.phase == Player.Finish and not player.dead and
      #player.room.logic:getActualDamageEvents(1, function (e)
        return e.data.from == player
      end, Player.HistoryTurn) == 0 then
      local turn_event = player.room.logic:getCurrentEvent():findParent(GameEvent.Turn)
      return turn_event and turn_event.data.reason == pingrong.name and turn_event.data.who == player
    end
  end,
  on_use = function(self, event, target, player, data)
    player.room:loseHp(player, 1, pingrong.name)
  end,
})

return pingrong
