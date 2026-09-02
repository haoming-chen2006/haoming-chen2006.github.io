local lueying = fk.CreateSkill({
  name = "lueying",
})

Fk:loadTranslationTable{
  ["lueying"] = "掠影",
  ["#lueying_charge"] = "掠影",
  [":lueying"] = "你使用【杀】结算结束后，若你拥有至少两个“椎”标记，则你移除两个“椎”标记，然后摸一张牌，"..
    "且可以选择一名角色视为对其使用一张【过河拆桥】。每阶段限两次，当你于出牌阶段内使用【杀】指定一个目标后，你获得一个“椎”标记。",

  ["@lueying_hit"] = "椎",
  ["#lueying-dismantlement"] = "掠影：你可以视为使用【过河拆桥】，选择%arg名角色为目标",

  ["$lueying1"] = "避实击虚，吾可不惮尔等蛮力！",
  ["$lueying2"] = "疾步如风，谁人可视吾影？",
}

lueying:addEffect(fk.TargetSpecified, {
  mute = true,
  times = function(self, player)
    return player.phase == Player.Play and 2 - player:usedEffectTimes(self.name, Player.HistoryPhase) or -1
  end,
  can_trigger = function(self, event, target, player, data)
    return
      target == player and
      data.card.trueName == "slash" and
      player.phase == Player.Play and
      player:hasSkill(lueying.name) and
      player:usedEffectTimes(self.name, Player.HistoryPhase) < 2
  end,
  on_cost = Util.TrueFunc,
  on_use = function(self, event, target, player, data)
    player.room:addPlayerMark(player, "@lueying_hit")
  end,
})

lueying:addEffect(fk.CardUseFinished, {
  anim_type = "control",
  can_trigger = function(self, event, target, player, data)
    return
      player:hasSkill(lueying.name) and
      target == player and
      data.card.trueName == "slash" and
      player:getMark("@lueying_hit") > 1
  end,
  on_cost = Util.TrueFunc,
  on_use = function(self, event, target, player, data)
    ---@type string
    local skillName = lueying.name
    local room = player.room
    room:removePlayerMark(player, "@lueying_hit", 2)
    room:drawCards(player, 1, skillName)
    local dismantlement = Fk:cloneCard("dismantlement")
    dismantlement.skillName = skillName
    if player:prohibitUse(dismantlement) then return false end
    local max_num = dismantlement.skill:getMaxTargetNum(player, dismantlement)
    if max_num == 0 then return false end
    local targets = {}
    for _, p in ipairs(room.alive_players) do
      if not (p == player or p:isAllNude() or player:isProhibited(p, dismantlement)) then
        table.insert(targets, p)
      end
    end
    if #targets == 0 then return false end
    local tos = room:askToChoosePlayers(
      player,
      {
        targets = targets,
        min_num = 1,
        max_num = max_num,
        prompt = "#lueying-dismantlement:::" .. max_num,
        skill_name = skillName,
        cancelable = true,
        no_indicate = true
      }
    )
    if #tos > 0 then
      room:useCard({
        from = player,
        tos = tos,
        card = dismantlement,
      })
    end
  end,
})

lueying:addLoseEffect(function (self, player)
  player.room:setPlayerMark(player, "@lueying_hit", 0)
end)

return lueying
