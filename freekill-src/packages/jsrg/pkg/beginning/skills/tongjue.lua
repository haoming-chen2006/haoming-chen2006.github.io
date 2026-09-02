local tongjue = fk.CreateSkill {
  name = "tongjue",
  tags = { Skill.Lord },
}

Fk:loadTranslationTable{
  ["tongjue"] = "通绝",
  [":tongjue"] = "主公技，出牌阶段限一次，你可以将任意张手牌交给等量的其他群势力角色各一张，若如此做，于此回合内不能选择这些角色为你使用牌的目标。",

  ["#tongjue"] = "通绝：你可以将手牌分配给其他群势力角色各一张",
}

tongjue:addEffect("active", {
  anim_type = "support",
  prompt = "#tongjue",
  card_num = 0,
  target_num = 0,
  can_use = function(self, player)
    return player:usedSkillTimes(tongjue.name, Player.HistoryPhase) == 0 and not player:isKongcheng() and
      table.find(Fk:currentRoom().alive_players, function(p)
        return p ~= player and p.kingdom == "qun"
      end)
  end,
  card_filter = Util.FalseFunc,
  target_filter = Util.FalseFunc,
  on_use = function(self, room, effect)
    local player = effect.from
    local targets = table.filter(room:getOtherPlayers(player, false), function(p)
      return p.kingdom == "qun"
    end)
    local list = room:askToYiji(player, {
      cards = player:getCardIds("h"),
      targets = targets,
      skill_name = tongjue.name,
      min_num = 1,
      max_num = 9,
      prompt = "#tongjue",
      single_max = 1,
    })
    if player.dead then return end
    local mark = player:getTableMark("tongjue-turn")
    for key, value in pairs(list) do
      if #value > 0 then
        table.insertIfNeed(mark, key)
      end
    end
    room:setPlayerMark(player, "tongjue-turn", mark)
  end,
})

tongjue:addEffect("prohibit", {
  is_prohibited = function(self, from, to, card)
    if from and card then
      return table.contains(from:getTableMark("tongjue-turn"), to.id)
    end
  end,
})

return tongjue
