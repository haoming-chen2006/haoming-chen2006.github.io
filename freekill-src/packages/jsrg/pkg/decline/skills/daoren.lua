local daoren = fk.CreateSkill {
  name = "daoren",
}

Fk:loadTranslationTable{
  ["daoren"] = "蹈刃",
  [":daoren"] = "出牌阶段限一次，你可以交给一名角色一张手牌，然后你对你与其攻击范围内均包含的所有角色各造成1点伤害。",

  ["#daoren"] = "蹈刃：交给一名角色一张手牌，对你与其攻击范围内均包含的角色各造成1点伤害",
  ["#daoren_tip"] = "造成伤害",
}

daoren:addEffect("active", {
  anim_type = "offensive",
  prompt = "#daoren",
  target_tip = function (self, player, to_select, selected, selected_cards, card, selectable, extra_data)
    if #selected == 1 and player:inMyAttackRange(to_select) and selected[1]:inMyAttackRange(to_select) then
      return "#daoren_tip"
    end
  end,
  card_num = 1,
  target_num = 1,
  can_use = function(self, player)
    return player:usedSkillTimes(daoren.name, Player.HistoryPhase) == 0
  end,
  card_filter = function(self, player, to_select, selected)
    return #selected == 0 and table.contains(player:getCardIds("h"), to_select)
  end,
  target_filter = function(self, player, to_select, selected)
    return #selected == 0 and to_select ~= player
  end,
  on_use = function(self, room, effect)
    local player = effect.from
    local target = effect.tos[1]
    room:obtainCard(target, effect.cards, false, fk.ReasonGive, player, daoren.name)
    if player.dead or target.dead then return end

    local targets = table.filter(room:getAlivePlayers(), function(p)
      return player:inMyAttackRange(p) and target:inMyAttackRange(p)
    end)
    if #targets > 0 then
      room:doIndicate(player, targets)
      for _, p in ipairs(targets) do
        if not p.dead then
          room:damage{
            from = player,
            to = p,
            damage = 1,
            skill_name = daoren.name,
          }
        end
      end
    end
  end,
})

return daoren
