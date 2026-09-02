local danshou = fk.CreateSkill {
  name = "danshou",
}

Fk:loadTranslationTable {
  ["danshou"] = "胆守",
  [":danshou"] = "出牌阶段，你可以弃置X张牌并选择你攻击范围内的一名其他角色（X为你此阶段内发动〖胆守〗的次数），若X为：1，你弃置其一张牌；" ..
      "2，其将一张牌交给你；3，你对其造成1点伤害；不小于4，你与其各摸两张牌。",

  ["#danshou1"] = "胆守：你可以弃置1张牌，弃置攻击范围内一名角色一张牌",
  ["#danshou2"] = "胆守：你可以弃置2张牌，令攻击范围内一名角色交给你一张牌",
  ["#danshou3"] = "胆守：你可以弃置3张牌，对攻击范围内一名角色造成1点伤害",
  ["#danshou4"] = "胆守：你可以弃置%arg张牌，与攻击范围内一名角色各摸两张牌",
  ["#danshou-give"] = "胆守：你需交给 %dest 一张牌",

  ["$danshou1"] = "到此为止了！",
  ["$danshou2"] = "以胆为守，扼敌咽喉！",
}

danshou:addEffect("active", {
  anim_type = "offensive",
  prompt = function(self, player)
    local n = player:usedSkillTimes(danshou.name, Player.HistoryPhase) + 1
    if n < 4 then
      return "#danshou" .. n
    else
      return "#danshou4:::" .. n
    end
  end,
  card_num = function(self, player)
    return player:usedSkillTimes(danshou.name, Player.HistoryPhase) + 1
  end,
  target_num = 1,
  can_use = Util.TrueFunc,
  card_filter = function(self, player, to_select, selected)
    return #selected < player:usedSkillTimes(danshou.name, Player.HistoryPhase) + 1 and
        not player:prohibitDiscard(to_select)
  end,
  target_filter = function(self, player, to_select, selected, selected_cards)
    return #selected == 0 and player:inMyAttackRange(to_select, nil, selected_cards) and
        #selected_cards == player:usedSkillTimes(danshou.name, Player.HistoryPhase) + 1
  end,
  on_use = function(self, room, effect)
    local player = effect.from
    local target = effect.tos[1]
    room:throwCard(effect.cards, danshou.name, player, player)
    if #effect.cards == 1 then
      if player.dead or target:isNude() then return end
      local id = room:askToChooseCard(player, {
        target = target,
        flag = "he",
        skill_name = danshou.name
      })
      room:throwCard(id, danshou.name, target, player)
    elseif #effect.cards == 2 then
      if player.dead or target.dead or target:isNude() then return end
      local card = room:askToCards(target, {
        min_num = 1,
        max_num = 1,
        include_equip = true,
        skill_name = danshou.name,
        prompt = "#danshou-give::" .. player.id,
        cancelable = false,
      })
      room:obtainCard(player, card, false, fk.ReasonGive, target, danshou.name)
    elseif #effect.cards == 3 then
      room:damage {
        from = player,
        to = target,
        damage = 1,
        skillName = danshou.name,
      }
    else
      if not player.dead then
        player:drawCards(2, danshou.name)
      end
      if not target.dead then
        target:drawCards(2, danshou.name)
      end
    end
  end,
})

return danshou
