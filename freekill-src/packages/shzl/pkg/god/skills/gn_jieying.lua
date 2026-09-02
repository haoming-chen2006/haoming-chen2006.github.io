local jieying = fk.CreateSkill {
  name = "gn_jieying",
}

Fk:loadTranslationTable{
  ["gn_jieying"] = "劫营",
  [":gn_jieying"] = "回合开始时，若没有角色有“营”标记，你获得一个“营”标记；结束阶段你可以将“营”标记交给一名其他角色；有“营”的角色"..
  "摸牌阶段多摸一张牌、出牌阶段使用【杀】的次数上限+1、手牌上限+1。有“营”的其他角色的结束阶段，你获得其“营”标记及所有手牌。",

  ["@@jieying_camp"] = "营",
  ["#gn_jieying-choose"] = "劫营：你可以将“营”标记交给其他角色",

  ["$gn_jieying1"] = "裹甲衔枚，劫营如入无人之境。",
  ["$gn_jieying2"] = "劫营速战，措手不及。",
}

jieying:addLoseEffect(function (self, player)
  local room = player.room
  if table.every(room.alive_players, function (p) return not p:hasSkill(jieying.name, true) end) then
    for _, p in ipairs(room.alive_players) do
      room:setPlayerMark(p, "@@jieying_camp", 0)
    end
  end
end)

jieying:addEffect(fk.TurnStart, {
  anim_type = "special",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(jieying.name) and
      table.every(player.room.alive_players, function (p)
        return p:getMark("@@jieying_camp") == 0
      end)
  end,
  on_cost = Util.TrueFunc,
  on_use = function(self, event, target, player, data)
    player.room:addPlayerMark(player, "@@jieying_camp")
  end,
})
jieying:addEffect(fk.DrawNCards, {
  anim_type = "drawcard",
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(jieying.name) and target:getMark("@@jieying_camp") > 0
  end,
  on_cost = Util.TrueFunc,
  on_use = function(self, event, target, player, data)
    data.n = data.n + 1
  end,
})
jieying:addEffect(fk.EventPhaseStart, {
  anim_type = "control",
  can_trigger = function(self, event, target, player, data)
    if player:hasSkill(jieying.name) and target.phase == Player.Finish and target:getMark("@@jieying_camp") > 0 then
      if target == player then
        return #player.room:getOtherPlayers(player, false) > 0
      else
        return true
      end
    end
  end,
  on_cost = function(self, event, target, player, data)
    if target == player then
      local room = player.room
      local to = room:askToChoosePlayers(player, {
        min_num = 1,
        max_num = 1,
        targets = room:getOtherPlayers(player, false),
        skill_name = jieying.name,
        prompt = "#gn_jieying-choose",
        cancelable = true,
      })
      if #to > 0 then
        event:setCostData(self, {tos = to})
        return true
      end
    else
      event:setCostData(self, {tos = {target}})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    if target == player then
      local to = event:getCostData(self).tos[1]
      room:setPlayerMark(player, "@@jieying_camp", 0)
      room:addPlayerMark(to, "@@jieying_camp")
    else
      room:setPlayerMark(target, "@@jieying_camp", 0)
      room:addPlayerMark(player, "@@jieying_camp")
      if not target:isKongcheng() then
        room:obtainCard(player.id, target:getCardIds("h"), false, fk.ReasonPrey, player, jieying.name)
      end
    end
  end,
})
jieying:addEffect("targetmod", {
  residue_func = function(self, player, skill, scope)
    if skill.trueName == "slash_skill" and player:getMark("@@jieying_camp") > 0 and scope == Player.HistoryPhase then
      return #table.filter(Fk:currentRoom().alive_players, function (p)
        return p:hasSkill(jieying.name)
      end)
    end
  end,
})
jieying:addEffect("maxcards", {
  correct_func = function(self, player)
    if player:getMark("@@jieying_camp") > 0 then
      return #table.filter(Fk:currentRoom().alive_players, function (p)
        return p:hasSkill(jieying.name)
      end)
    else
      return 0
    end
  end,
})

return jieying
