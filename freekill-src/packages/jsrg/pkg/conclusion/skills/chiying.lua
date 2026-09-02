local chiying = fk.CreateSkill {
  name = "js__chiying",
}

Fk:loadTranslationTable{
  ["js__chiying"] = "驰应",
  [":js__chiying"] = "出牌阶段限一次，你可以选择一名角色，令其攻击范围内的其他角色各弃置一张牌，若弃置的基本牌数不大于其体力值，其获得这些基本牌。",

  ["#js__chiying"] = "驰应：选择一名角色，其攻击范围内的其他角色各弃置一张牌",

  ["$js__chiying1"] = "街亭危在旦夕，当合兵一道急援。",
  ["$js__chiying2"] = "子龙勿忧，某助将军来擒姜维。",
}

chiying:addEffect("active", {
  anim_type = "control",
  prompt = "#js__chiying",
  card_num = 0,
  target_num = 1,
  can_use = function(self, player)
    return player:usedSkillTimes(chiying.name, Player.HistoryPhase) == 0
  end,
  card_filter = Util.FalseFunc,
  target_filter = function(self, player, to_select, selected)
    return #selected == 0
  end,
  on_use = function(self, room, effect)
    local player = effect.from
    local target = effect.tos[1]
    local ids = {}
    for _, p in ipairs(room:getAlivePlayers()) do
      if p ~= player and not p.dead and target:inMyAttackRange(p) then
        local card = room:askToDiscard(p, {
          min_num = 1,
          max_num = 1,
          include_equip = true,
          skill_name = chiying.name,
          cancelable = false,
        })
        if #card > 0 and Fk:getCardById(card[1]).type == Card.TypeBasic then
          table.insertIfNeed(ids, card[1])
        end
      end
    end
    if #ids == 0 or #ids > target.hp or target.dead then return end
    ids = table.filter(ids, function(id)
      return table.contains(room.discard_pile, id)
    end)
    if #ids == 0 then return end
    room:moveCardTo(ids, Card.PlayerHand, target, fk.ReasonJustMove, chiying.name, nil, true, target)
  end,
})

return chiying
