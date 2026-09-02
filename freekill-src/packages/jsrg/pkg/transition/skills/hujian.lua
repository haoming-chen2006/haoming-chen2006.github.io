local hujian = fk.CreateSkill {
  name = "hujian",
}

Fk:loadTranslationTable{
  ["hujian"] = "护剑",
  [":hujian"] = "游戏开始时，你从游戏外获得一张【赤血青锋】；一名角色回合结束时，此回合最后一名使用或打出过的牌的角色可以获得弃牌堆中的【赤血青锋】。",

  ["#hujian-invoke"] = "护剑：你可以获得弃牌堆中的【赤血青锋】",
}

hujian:addEffect(fk.GameStart, {
  anim_type = "drawcard",
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(hujian.name)
  end,
  on_cost = Util.TrueFunc,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local card = room:printCard("blood_sword", Card.Spade, 6)
    room:moveCardTo(card, Card.PlayerHand, player, fk.ReasonJustMove, hujian.name, nil, true, player)
  end,
})

hujian:addEffect(fk.TurnEnd, {
  anim_type = "negative",
  can_trigger = function(self, event, target, player, data)
    if player:hasSkill(hujian.name) and
      table.find(player.room.discard_pile, function(id)
        return Fk:getCardById(id).trueName == "blood_sword"
      end) then
      local to
      local use_events = player.room.logic:getEventsByRule(GameEvent.UseCard, 1, Util.TrueFunc, nil, Player.HistoryTurn)
      local respond_events = player.room.logic:getEventsByRule(GameEvent.RespondCard, 1, Util.TrueFunc, nil, Player.HistoryTurn)
      if #use_events > 0 then
        to = use_events[1].data.from
      end
      if #respond_events > 0 then
        if to then
          if respond_events[1].id > use_events[1].id then
            to = respond_events[1].data.from
          end
        else
          to = respond_events[1].data.from
        end
      end
      if to and not to.dead then
        event:setCostData(self, {tos = {to}})
        return true
      end
    end
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local to = event:getCostData(self).tos[1]
    return room:askToSkillInvoke(to, {
      skill_name = hujian.name,
      prompt = "#hujian-invoke",
    })
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local to = event:getCostData(self).tos[1]
    local cards = table.filter(room.discard_pile, function(id)
      return Fk:getCardById(id).trueName == "blood_sword"
    end)
    room:moveCardTo(cards, Card.PlayerHand, to, fk.ReasonJustMove, hujian.name, nil, true, to)
  end,
})

return hujian
