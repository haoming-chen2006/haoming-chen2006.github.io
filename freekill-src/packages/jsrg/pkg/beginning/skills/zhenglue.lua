local zhenglue = fk.CreateSkill {
  name = "zhenglue",
}

Fk:loadTranslationTable{
  ["zhenglue"] = "政略",
  [":zhenglue"] = "主公角色的回合结束时，你可以摸一张牌，然后令一名没有“猎”的角色获得“猎”，若主公角色于此回合内未造成过伤害，"..
  "则改为令至多两名没有“猎”的角色获得“猎”。<br>你对有“猎”的角色使用牌无距离和次数限制。<br>"..
  "每名角色的回合限一次，当你对有“猎”的角色造成伤害后，你可以摸一张牌并获得造成此伤害的牌。",

  ["#zhenglue-choose"] = "政略：令至多%arg名角色获得“猎”标记",
  ["#zhenglue1-invoke"] = "政略：是否摸一张牌并令角色获得“猎”？",
  ["#zhenglue2-invoke"] = "政略：你可以摸一张牌并获得造成伤害的牌",
  ["@@caocao_lie"] = "猎",

  ["$zhenglue1"] = "治政用贤不以德，则四方定。",
  ["$zhenglue2"] = "秉至公而服天下，孤大略成。",
}

zhenglue:addEffect(fk.TurnEnd, {
  anim_type = "drawcard",
  can_trigger = function(self, event, target, player, data)
    return target.role == "lord" and player:hasSkill(zhenglue.name)
  end,
  on_cost = function(self, event, target, player, data)
    return player.room:askToSkillInvoke(player, {
      skill_name = zhenglue.name,
      prompt = "#zhenglue1-invoke",
    })
  end,
  on_use = function (self, event, target, player, data)
    local room = player.room
    player:drawCards(1, zhenglue.name)
    if player.dead then return end
    local targets = table.filter(room.alive_players, function(p)
      return p:getMark("@@caocao_lie") == 0
    end)
    if #targets == 0 then return end
    local x = 1
    if #targets > 1 and #player.room.logic:getActualDamageEvents(1, function (e)
      return e.data.from == target
    end, Player.HistoryTurn) == 0 then
      x = 2
    end
    local tos = room:askToChoosePlayers(player, {
      targets = targets,
      min_num = 1,
      max_num = x,
      prompt = "#zhenglue-choose:::"..x,
      skill_name = zhenglue.name,
      cancelable = false,
    })
    for _, to in ipairs(tos) do
      room:setPlayerMark(to, "@@caocao_lie", 1)
    end
  end,
})
zhenglue:addEffect(fk.Damage, {
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(zhenglue.name) and data.to:getMark("@@caocao_lie") > 0 and
      player:usedEffectTimes(self.name, Player.HistoryTurn) == 0
  end,
  on_cost = function(self, event, target, player, data)
    return player.room:askToSkillInvoke(player, {
      skill_name = zhenglue.name,
      prompt = "#zhenglue2-invoke",
    })
  end,
  on_use = function (self, event, target, player, data)
    local room = player.room
    player:drawCards(1, zhenglue.name)
    if player.dead then return end
    if data.card and room:getCardArea(data.card) == Card.Processing then
      room:moveCardTo(data.card, Card.PlayerHand, player, fk.ReasonJustMove, zhenglue.name, nil, true, player)
    end
  end,
})

zhenglue:addEffect("targetmod", {
  bypass_times = function(self, player, skill, scope, card, to)
    return card and player:hasSkill(zhenglue.name) and to and to:getMark("@@caocao_lie") > 0
  end,
  bypass_distances = function(self, player, skill, card, to)
    return card and player:hasSkill(zhenglue.name) and to and to:getMark("@@caocao_lie") > 0
  end,
})

zhenglue:addLoseEffect(function (self, player, is_death)
  local room = player.room
  if not table.find(room.alive_players, function(p)
    return p:hasSkill(zhenglue.name, true)
  end) then
    for _, p in ipairs(room.alive_players) do
      room:setPlayerMark(p, "@@caocao_lie", 0)
    end
  end
end)

return zhenglue
