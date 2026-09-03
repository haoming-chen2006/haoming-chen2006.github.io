
local mieguo = fk.CreateSkill {
  name = "mieguo",
  tags = { Skill.Quest },
}

Fk:loadTranslationTable{
  ["mieguo"] = "灭虢",
  [":mieguo"] = "使命技，额定回合结束后，你可以获得一名其他角色至多三张牌并令其指定等量角色，然后你执行一个不能对其指定角色使用牌的额外回合。<br>"..
  "⬤　失败：此回合你未使用过牌，你减1点体力上限。",

  ["#mieguo-invoke"] = "灭虢：你可以获得一名其他角色至多三张牌并执行额外回合，其选择等量角色令你此回合不能对其使用牌",
  ["#mieguo-prey"] = "灭虢：获得 %dest 至多三张牌并执行额外回合，其选择等量角色令你此回合不能对其使用牌",
  ["#mieguo-choose"] = "灭虢：选择%arg名角色，令 %src 此回合不能对这些角色使用牌",
}

mieguo:addEffect(fk.TurnEnd, {
  anim_type = "control",
  can_trigger = function (self, event, target, player, data)
    return target == player and player:hasSkill(mieguo.name) and
      player:getQuestSkillState(mieguo.name) == nil and data.reason == "game_rule" and
      table.find(player.room:getOtherPlayers(player, false), function (p)
        return not p:isNude()
      end)
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local targets = table.filter(room:getOtherPlayers(player, false), function(p)
      return not p:isNude()
    end)
    local to = room:askToChoosePlayers(player, {
      targets = targets,
      min_num = 1,
      max_num = 1,
      prompt = "#mieguo-invoke",
      skill_name = mieguo.name,
      cancelable = true,
    })
    if #to > 0 then
      event:setCostData(self, { tos = to })
      return true
    end
  end,
  on_use = function (self, event, target, player, data)
    local room = player.room
    local to = event:getCostData(self).tos[1]
    local cards = room:askToChooseCards(player, {
      target = to,
      min = 1,
      max = 3,
      flag = "he",
      skill_name = mieguo.name,
      prompt = "#mieguo-prey::"..to.id,
    })
    room:moveCardTo(cards, Card.PlayerHand, player, fk.ReasonPrey, mieguo.name, nil, false, player)
    local targets = {}
    if not to.dead then
      targets = room:askToChoosePlayers(to, {
        targets = room.alive_players,
        min_num = #cards,
        max_num = #cards,
        prompt = "#mieguo-choose:"..player.id.."::"..#cards,
        skill_name = mieguo.name,
        cancelable = false,
      })
    end
    if not player.dead then
      player:gainAnExtraTurn(true, mieguo.name, nil, { mieguo = targets })
    end
  end,
})

mieguo:addEffect(fk.TurnEnd, {
  anim_type = "negative",
  is_delay_effect = true,
  can_trigger = function (self, event, target, player, data)
    return target == player and player:hasSkill(mieguo.name) and
      data.reason == mieguo.name and
      #player.room.logic:getEventsOfScope(GameEvent.UseCard, 1, function (e)
        return e.data.from == player
      end, Player.HistoryTurn) == 0
  end,
  on_use = function (self, event, target, player, data)
    local room = player.room
    room:updateQuestSkillState(player, mieguo.name, true)
    room:changeMaxHp(player, -1)
    room:invalidateSkill(player, mieguo.name)
  end,
})

mieguo:addEffect(fk.TurnStart, {
  can_refresh = function (self, event, target, player, data)
    return target == player and (data.extra_data or {}).mieguo
  end,
  on_refresh = function (self, event, target, player, data)
    player.room:setPlayerMark(player, "mieguo-turn", data.extra_data.mieguo)
  end,
})

mieguo:addEffect("prohibit", {
  is_prohibited = function (self, from, to, card)
    return from and to and card and
      Fk:currentRoom():getCurrent() == from and table.contains(from:getTableMark("mieguo-turn"), to)
  end,
})

return mieguo
