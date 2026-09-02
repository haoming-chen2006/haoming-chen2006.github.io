local xiongluan = fk.CreateSkill {
  name = "xiongluan",
  tags = {Skill.Limited},
}

Fk:loadTranslationTable{
  ["xiongluan"] = "雄乱",
  [":xiongluan"] = "限定技，出牌阶段，你可以废除你的判定区和装备区，然后指定一名其他角色。直到回合结束，你对其使用牌无距离和次数限制，"..
  "其不能使用和打出手牌。",

  ["#xiongluan"] = "雄乱：废除装备区和判定区，选择一名角色，本回合对其使用牌无距离次数限制且其不能使用打出手牌！",
  ["@@xiongluan-turn"] = "雄乱",

  ["$xiongluan1"] = "北地枭雄，乱世不败！",
  ["$xiongluan2"] = "雄据宛城，虽乱世可安！",
}

xiongluan:addEffect("active", {
  anim_type = "offensive",
  prompt = "#xiongluan",
  card_num = 0,
  target_num = 1,
  can_use = function(self, player)
    return player:usedSkillTimes(xiongluan.name, Player.HistoryGame) == 0 and
    (#player:getAvailableEquipSlots() > 0 or not table.contains(player.sealedSlots, Player.JudgeSlot))
  end,
  card_filter = Util.FalseFunc,
  target_filter = function(self, player, to_select, selected)
    return to_select ~= player
  end,
  on_use = function(self, room, effect)
    local player = effect.from
    local target = effect.tos[1]
    local eqipSlots = player:getAvailableEquipSlots()
    if not table.contains(player.sealedSlots, Player.JudgeSlot) then
      table.insert(eqipSlots, Player.JudgeSlot)
    end
    room:abortPlayerArea(player, eqipSlots)
    if target.dead or player.dead then return end
    room:addPlayerMark(target, "@@xiongluan-turn")
    room:addTableMarkIfNeed(player, "xiongluan_target-turn", target.id)
  end,
})
xiongluan:addEffect("prohibit", {
  prohibit_use = function(self, player, card)
    if player:getMark("@@xiongluan-turn") > 0 then
      local subcards = card:isVirtual() and card.subcards or {card.id}
      return #subcards > 0 and
        table.every(subcards, function(id)
          return table.contains(player:getCardIds("h"), id)
        end)
    end
  end,
  prohibit_response = function(self, player, card)
    if player:getMark("@@xiongluan-turn") > 0 then
      local subcards = card:isVirtual() and card.subcards or {card.id}
      return #subcards > 0 and
        table.every(subcards, function(id)
          return table.contains(player:getCardIds("h"), id)
        end)
    end
  end,
})
xiongluan:addEffect("targetmod", {
  bypass_times = function(self, player, skill, scope, card, to)
    return card and to and table.contains(player:getTableMark("xiongluan_target-turn"), to.id)
  end,
  bypass_distances = function(self, player, skill, card, to)
    return card and to and table.contains(player:getTableMark("xiongluan_target-turn"), to.id)
  end,
})

return xiongluan
