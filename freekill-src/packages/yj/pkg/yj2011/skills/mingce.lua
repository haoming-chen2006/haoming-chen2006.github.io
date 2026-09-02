
local mingce = fk.CreateSkill {
  name = "mingce",
}

Fk:loadTranslationTable{
  ["mingce"] = "明策",
  [":mingce"] = "出牌阶段限一次，你可以交给一名其他角色一张装备牌或【杀】，其选择一项：1.视为对其攻击范围内一名你指定的角色使用一张【杀】；"..
  "2.摸一张牌。",

  ["#mingce"] = "明策：交给一名角色一张装备牌或【杀】，其选择视为对你指定的角色使用【杀】或摸一张牌",
  ["#mingce-choose"] = "明策：选择 %dest 视为使用【杀】的目标",
  ["mingce_slash"] = "视为对%dest使用【杀】",
  ["mingce_tip_slash"] = "使用杀",
  ["mingce_tip_target"] = "杀的目标",

  ["$mingce1"] = "如此，霸业可图也。",
  ["$mingce2"] = "如此，一击可擒也。",
}

mingce:addEffect("active", {
  anim_type = "support",
  prompt = "#mingce",
  can_use = function(self, player)
    return player:usedSkillTimes(mingce.name, Player.HistoryPhase) == 0
  end,
  card_filter = function(self, player, to_select, selected)
    return #selected == 0 and (Fk:getCardById(to_select).trueName == "slash" or Fk:getCardById(to_select).type == Card.TypeEquip)
  end,
  target_filter = function(self, player, to_select, selected)
    if #selected > 1 then
      return false
    end

    if #selected > 0 then
      return selected[1]:inMyAttackRange(to_select)
    end

    return to_select ~= player
  end,
  target_tip = function(self, player, to_select, selected)
    if #selected == 0 then
      return
    end

    if selected[1] == to_select then
      return "mingce_tip_slash"
    elseif selected[2] == to_select then
      return "mingce_tip_target"
    end
  end,
  feasible = function(self, player, selected, selected_cards)
    if #selected_cards ~= 1 then
      return false
    end

    if
      #selected > 0 and
      not table.find(Fk:currentRoom().alive_players, function(p) return selected[1]:inMyAttackRange(p) end)
    then
      return #selected == 1
    end

    return #selected == 2
  end,
  on_use = function(self, room, effect)
    local player = effect.from
    local target = effect.tos[1]
    room:obtainCard(target, effect.cards, false, fk.ReasonGive, player)
    if not target:isAlive() then
      return
    end

    if #effect.tos == 1 then
      target:drawCards(1, mingce.name)
    else
      local to = effect.tos[2]
      local choice = room:askToChoice(
        target,
        {
          choices = { "mingce_slash::" .. to.id, "draw1" },
          skill_name = mingce.name,
        }
      )
      if choice == "draw1" then
        target:drawCards(1, mingce.name)
      else
        room:useVirtualCard("slash", nil, target, to, mingce.name, true)
      end
    end
  end,
})

return mingce
