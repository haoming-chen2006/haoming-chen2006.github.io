local cuifeng = fk.CreateSkill {
  name = "cuifeng",
  tags = { Skill.Limited },
}

Fk:loadTranslationTable{
  ["cuifeng"] = "摧锋",
  [":cuifeng"] = "限定技，出牌阶段，你可以视为使用一张唯一目标的伤害类牌（无距离限制），此回合结束时，若此牌目标角色本回合受到的伤害不为1，"..
  "你重置你的所有技能。",

  ["#cuifeng"] = "摧锋：视为使用一种伤害牌！若目标本回合受到的伤害不为1则回合结束时重置所有技能！",
}

cuifeng:addEffect("viewas", {
  anim_type = "offensive",
  prompt = "#cuifeng",
  interaction = function(self, player)
    if player:getMark(cuifeng.name) == 0 then
      local names = table.filter(Fk:getAllCardNames("bt"), function (name)
        local card = Fk:cloneCard(name)
        return card.is_damage_card and card.skill.target_num == 1
      end)
      player:setMark(cuifeng.name, names)
    end
    local all_names = player:getMark(cuifeng.name)
    local names = player:getViewAsCardNames(cuifeng.name, all_names, nil, nil, {bypass_distances = true})
    return UI.CardNameBox { choices = names, all_choices = all_names }
  end,
  card_filter = Util.FalseFunc,
  view_as = function(self, player, cards)
    local card = Fk:cloneCard(self.interaction.data)
    card.skillName = cuifeng.name
    return card
  end,
  enabled_at_play = function(self, player)
    return player:usedSkillTimes(cuifeng.name, Player.HistoryGame) == 0
  end,
})

cuifeng:addEffect(fk.TurnEnd, {
  can_refresh = function (self, event, target, player, data)
    if player:usedSkillTimes(cuifeng.name, Player.HistoryTurn) > 0 then
      local infos = {}
      player.room.logic:getEventsOfScope(GameEvent.UseCard, 1, function (e)
        local use = e.data
        if use.from == player and table.contains(use.card.skillNames, cuifeng.name) then
          table.insert(infos, use.tos)
        end
      end, Player.HistoryTurn)
      local damage_record = {}
      player.room.logic:getActualDamageEvents(1, function (e)
        local damage = e.data
        damage_record[damage.to] = (damage_record[damage.to] or 0) + damage.damage
      end, Player.HistoryTurn)
      return table.find(infos, function (tos)
        local n = 0
        for _, p in ipairs(tos) do
          n = n + (damage_record[p] or 0)
        end
        return n ~= 1
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

cuifeng:addEffect("targetmod", {
  bypass_distances = function(self, player, skill, card)
    return card and table.contains(card.skillNames, cuifeng.name)
  end,
})

return cuifeng
