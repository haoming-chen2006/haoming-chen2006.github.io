local mouZhiji = fk.CreateSkill({
  name = "mou__zhiji",
  tags = { Skill.Wake },
})

Fk:loadTranslationTable{
  ["mou__zhiji"] = "志继",
  [":mou__zhiji"] = "觉醒技，准备阶段，若你因发动〖挑衅〗累计消耗的蓄力点大于3，你减1点体力上限，" ..
  "令任意名角色获得“北伐”标记直到你的下回合开始或死亡；拥有“北伐”标记的角色使用牌只能指定你或其为目标。",

  ["#mou__tiaoxin-slash"] = "挑衅：你须对 %src 使用【杀】，否则须交给 %src 一张牌",
  ["#mou__tiaoxin-give"] = "挑衅：请交给 %src 一张牌",
  ["#mou__zhiji-choose"] = "志继：令任意名角色获得“北伐”标记",
  ["@@mou__zhiji"] = "北伐",

  ["$mou__zhiji1"] = "丞相之志，维岂敢忘之！",
  ["$mou__zhiji2"] = "北定中原终有日！",
}

mouZhiji:addEffect(fk.EventPhaseStart, {
  can_trigger = function(self, event, target, player, data)
    return
      target == player and
      player:hasSkill(mouZhiji.name) and
      player.phase == Player.Start and
      player:usedSkillTimes(mouZhiji.name, Player.HistoryGame) == 0
  end,
  can_wake = function(self, event, target, player, data)
    return player:getMark("mou__zhiji_count") > 3
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    room:changeMaxHp(player, -1)
    if player.dead then return end
    local tos = room:askToChoosePlayers(
      player,
      {
        targets = room:getAlivePlayers(false),
        min_num = 1,
        max_num = 999,
        prompt = "#mou__zhiji-choose",
        skill_name = mouZhiji.name
      }
    )
    for _, p in ipairs(tos) do
      room:addTableMarkIfNeed(p, "@@mou__zhiji", player.id)
    end
  end,
})

local removeBeifaMarkCanRefresh = function(self, event, target, player, data)
  return target == player
end

local removeBeifaMarkOnRefresh = function(self, event, target, player, data)
  local room = player.room
  for _, p in ipairs(room.alive_players) do
    local mark = p:getTableMark("@@mou__zhiji")
    if table.contains(mark, player.id) then
      table.removeOne(mark, player.id)
      room:setPlayerMark(p, "@@mou__zhiji", #mark > 0 and mark or 0)
    end
  end
end

mouZhiji:addEffect(fk.TurnStart, {
  can_refresh = removeBeifaMarkCanRefresh,
  on_refresh = removeBeifaMarkOnRefresh,
})

mouZhiji:addEffect(fk.Death, {
  can_refresh = removeBeifaMarkCanRefresh,
  on_refresh = removeBeifaMarkOnRefresh,
})

mouZhiji:addEffect("prohibit", {
  is_prohibited = function(self, from, to)
    if not from then return false end
    local mark = from:getTableMark("@@mou__zhiji")
    return #mark > 0 and from ~= to and not table.contains(mark, to.id)
  end,
})

return mouZhiji
