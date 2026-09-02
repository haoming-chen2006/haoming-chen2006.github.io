local dengnan = fk.CreateSkill {
  name = "dengnan",
  tags = { Skill.Limited },
}

Fk:loadTranslationTable{
  ["dengnan"] = "登难",
  [":dengnan"] = "限定技，出牌阶段，你可以视为使用一张非伤害类普通锦囊牌，此回合结束时，若此牌的目标均于此回合受到过伤害，你重置你的所有技能。",

  ["#dengnan"] = "登难：视为使用一种非伤害普通锦囊牌！若目标本回合均受到伤害则回合结束时重置所有技能！",
  ["@@dengnan-turn"] = "登难",
}

dengnan:addEffect("viewas", {
  anim_type = "control",
  prompt = "#dengnan",
  interaction = function(self, player)
    if player:getMark(dengnan.name) == 0 then
      local names = table.filter(Fk:getAllCardNames("t"), function (name)
        return not Fk:cloneCard(name).is_damage_card
      end)
      player:setMark(dengnan.name, names)
    end
    local all_names = player:getMark(dengnan.name)
    local names = player:getViewAsCardNames(dengnan.name, all_names)
    return UI.CardNameBox { choices = names, all_choices = all_names }
  end,
  card_filter = Util.FalseFunc,
  view_as = function(self, player, cards)
    local card = Fk:cloneCard(self.interaction.data)
    card.skillName = dengnan.name
    return card
  end,
  enabled_at_play = function(self, player)
    return player:usedSkillTimes(dengnan.name, Player.HistoryGame) == 0
  end,
})

dengnan:addEffect(fk.TurnEnd, {
  can_refresh = function (self, event, target, player, data)
    if player:usedSkillTimes(dengnan.name, Player.HistoryTurn) > 0 then
      local infos = {}
      player.room.logic:getEventsOfScope(GameEvent.UseCard, 1, function (e)
        local use = e.data
        if use.from == player and table.contains(use.card.skillNames, dengnan.name) then
          table.insert(infos, use.tos)
        end
      end, Player.HistoryTurn)
      local damage_record = {}
      player.room.logic:getActualDamageEvents(1, function (e)
        local damage = e.data
        damage_record[damage.to] = damage_record[damage.to] or 1
      end, Player.HistoryTurn)
      return table.find(infos, function (tos)
        return table.every(tos, function (to)
          return damage_record[to]
        end)
      end)
    end
  end,
  on_refresh = function (self, event, target, player, data)
    for _, skill in ipairs(player:getSkillNameList()) do
      player:setSkillUseHistory(skill, 0, Player.HistoryGame)
      player:setSkillUseHistory(skill, 0, Player.HistoryRound)
      player:setSkillUseHistory(skill, 0, Player.HistoryTurn)
      player:setSkillUseHistory(skill, 0, Player.HistoryPhase)
    end
  end,
})

return dengnan
