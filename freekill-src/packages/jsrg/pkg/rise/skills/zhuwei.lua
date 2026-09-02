local zhuwei = fk.CreateSkill {
  name = "js__zhuwei",
}

Fk:loadTranslationTable{
  ["js__zhuwei"] = "筑围",
  [":js__zhuwei"] = "出牌阶段限一次，你可以移动场上一张装备牌，然后你可以令一名攻击范围内的角色数变为0的角色失去2点体力。",

  ["#js__zhuwei"] = "筑围：移动场上一张装备牌，然后可以令攻击范围内角色数因此变为0的角色失去2点体力！",
  ["#js__zhuwei-choose"] = "筑围：你可以令其中一名角色失去2点体力！",
}

zhuwei:addEffect("active", {
  anim_type = "control",
  prompt = "#js__zhuwei",
  card_num = 0,
  target_num = 2,
  can_use = function(self, player)
    return player:usedSkillTimes(zhuwei.name, Player.HistoryPhase) == 0
  end,
  card_filter = Util.FalseFunc,
  target_filter = function (self, player, to_select, selected)
    if #selected == 0 then
      return true
    elseif #selected == 1 then
      return to_select:canMoveCardsInBoardTo(selected[1], "e") or selected[1]:canMoveCardsInBoardTo(to_select, "e")
    end
  end,
  on_use = function(self, room, effect)
    local player = effect.from
    local record = {}
    for _, p in ipairs(room.players) do
      if p.dead then
        table.insert(record, 999)
      else
        table.insert(record, #table.filter(room.alive_players, function (q)
          return p:inMyAttackRange(q)
        end))
      end
    end
    room:askToMoveCardInBoard(player, {
      target_one = effect.tos[1],
      target_two = effect.tos[2],
      skill_name = zhuwei.name,
      flag = "e",
    })
    if player.dead then return end
    local targets = {}
    for i = 1, #room.players, 1 do
      local p = room.players[i]
      if not p.dead then
        local n = #table.filter(room.alive_players, function (q)
          return p:inMyAttackRange(q)
        end)
        if n == 0 and n ~= record[i] then
          table.insert(targets, p)
        end
      end
    end
    if #targets == 0 then return end
    local to = room:askToChoosePlayers(player, {
      targets = targets,
      min_num = 1,
      max_num = 1,
      prompt = "#js__zhuwei-choose",
      skill_name = zhuwei.name,
      cancelable = true,
    })
    if #to > 0 then
      room:loseHp(to[1], 2, zhuwei.name)
    end
  end,
})

return zhuwei
