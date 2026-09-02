local lunshi = fk.CreateSkill {
  name = "lunshi",
}

Fk:loadTranslationTable{
  ["lunshi"] = "论势",
  [":lunshi"] = "出牌阶段限一次，你可以令一名角色摸等同于其攻击范围内角色数的牌（至多摸至五张），然后令该角色弃置等同于攻击范围内含有其的角色数的牌。",

  ["#lunshi"] = "论势：令一名角色摸其攻击范围内角色数牌，然后其弃置攻击范围内含有其角色数牌",
  ["#lunshi_tip"] = "摸%arg弃%arg2",
}

lunshi:addEffect("active", {
  anim_type = "control",
  prompt = "#lunshi",
  target_tip = function (self, player, to_select, selected, selected_cards, card, selectable, extra_data)
    local n1 = 0
    if to_select:getHandcardNum() < 5 then
      n1 = #table.filter(Fk:currentRoom().alive_players, function(p)
        return to_select:inMyAttackRange(p)
      end)
      n1 = math.min(n1, 5 - to_select:getHandcardNum())
    end
    local n2 = #table.filter(Fk:currentRoom().alive_players, function(p)
      return p:inMyAttackRange(to_select)
    end)
    return "#lunshi_tip:::"..n1..":"..n2
  end,
  card_num = 0,
  target_num = 1,
  can_use = function(self, player)
    return player:usedSkillTimes(lunshi.name, Player.HistoryPhase) == 0
  end,
  card_filter = Util.FalseFunc,
  target_filter = function(self, player, to_select, selected)
    return #selected == 0
  end,
  on_use = function(self, room, effect)
    local target = effect.tos[1]
    local n = #table.filter(room.alive_players, function(p)
      return target:inMyAttackRange(p)
    end)
    if n > 0 and target:getHandcardNum() < 5 then
      target:drawCards(math.min(n, 5 - target:getHandcardNum()), lunshi.name)
    end
    if target.dead then return end
    n = #table.filter(room.alive_players, function(p)
      return p:inMyAttackRange(target)
    end)
    if n > 0 then
      room:askToDiscard(target, {
        min_num = n,
        max_num = n,
        include_equip = true,
        skill_name = lunshi.name,
        cancelable = false,
      })
    end
  end,
})

return lunshi
