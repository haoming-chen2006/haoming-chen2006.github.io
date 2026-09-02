local chenglue = fk.CreateSkill {
  name = "chenglue",
  tags = {Skill.Switch},
}

Fk:loadTranslationTable{
  ["chenglue"] = "成略",
  [":chenglue"] = "转换技，出牌阶段限一次，阳：你可以摸一张牌，然后弃置两张手牌；阴：你可以摸两张牌，然后弃置一张手牌。"..
  "若如此做，你于此阶段内使用与你以此法弃置的牌花色相同的牌无距离和次数限制。",

  [":chenglue_yang"] = "转换技，出牌阶段限一次，<font color=\"#E0DB2F\">阳：你可以摸一张牌，然后弃置两张手牌；</font>" ..
  "阴：你可以摸两张牌，然后弃置一张手牌。若如此做，你于此阶段内使用与你以此法弃置的牌花色相同的牌无距离和次数限制。",
  [":chenglue_yin"] = "转换技，出牌阶段限一次，阳：你可以摸一张牌，然后弃置两张手牌；"..
  "<font color=\"#E0DB2F\">阴：你可以摸两张牌，然后弃置一张手牌。</font>若如此做，你于此阶段内使用与你以此法弃置的牌花色相同的牌无距离和次数限制。",

  ["#chenglue-active"] = "成略：摸%arg张牌，弃置%arg2张手牌，本阶段使用这些花色的牌无距离次数限制",
  ["#chenglue-discard"] = "成略：弃置%arg张手牌，本阶段使用这些花色的牌无距离和次数限制",
  ["@chenglue-phase"] = "成略",

  ["$chenglue1"] = "成略在胸，良计速出。",
  ["$chenglue2"] = "吾有良略在怀，必为阿瞒所需。",
}

chenglue:addEffect("active", {
  anim_type = "switch",
  prompt = function (self, player)
    return player:getSwitchSkillState("chenglue", false) == fk.SwitchYang and "#chenglue-active:::1:2" or "#chenglue-active:::2:1"
  end,
  can_use = function(self, player)
    return player:usedSkillTimes(chenglue.name, Player.HistoryPhase) < 1
  end,
  card_filter = Util.FalseFunc,
  target_filter = Util.FalseFunc,
  on_use = function(self, room, effect)
    local player = effect.from
    local isYang = effect.switch_state == fk.SwitchYang

    player:drawCards(isYang and 1 or 2, chenglue.name)
    if player.dead then return end

    local num = isYang and 2 or 1
    local toDiscard = room:askToDiscard(player, {
      min_num = num,
      max_num = num,
      include_equip = false,
      skill_name = chenglue.name,
      cancelable = false,
      prompt = "#chenglue-discard:::"..num,
      skip = true,
    })
    if #toDiscard == 0 then return end

    for _, id in ipairs(toDiscard) do
      local suit = Fk:getCardById(id):getSuitString(true)
      if suit ~= "log_nosuit" then
        room:addTableMarkIfNeed(player, "@chenglue-phase", suit)
      end
    end
    room:throwCard(toDiscard, chenglue.name, player, player)
  end,
})
chenglue:addEffect(fk.PreCardUse, {
  can_refresh = function(self, event, target, player, data)
    return target == player and table.contains(player:getTableMark("@chenglue-phase"), data.card:getSuitString(true))
  end,
  on_refresh = function(self, event, target, player, data)
    data.extraUse = true
  end,
})
chenglue:addEffect("targetmod", {
  bypass_times = function(self, player, skill, scope, card)
    local mark = player:getTableMark("@chenglue-phase")
    if #mark > 0 then
      return card and card:matchVSPattern(".|.|" ..
        table.concat(table.map(mark, function(suit) return string.sub(suit, 5) end), ","))
    end
  end,
  bypass_distances = function(self, player, skill, card)
    local mark = player:getTableMark("@chenglue-phase")
    if #mark > 0 then
      return card and card:matchVSPattern(".|.|" ..
        table.concat(table.map(mark, function(suit) return string.sub(suit, 5) end), ","))
    end
  end,
})

return chenglue
