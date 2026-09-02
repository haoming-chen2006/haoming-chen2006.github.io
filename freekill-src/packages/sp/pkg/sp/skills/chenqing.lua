local chenqing = fk.CreateSkill {
  name = "chenqing",
}

Fk:loadTranslationTable {
  ["chenqing"] = "陈情",
  [":chenqing"] = "每轮限一次，当一名角色进入濒死状态时，你可以令另一名其他角色摸四张牌，然后弃置四张牌，若其以此法弃置的四张牌花色各不相同，"..
  "则其视为对濒死状态的角色使用一张【桃】。",

  ["#chenqing-choose"] = "陈情：令一名角色摸四张牌然后弃四张牌，若花色各不相同视为对 %dest 使用【桃】",
  ["#chenqing-discard"] = "陈情：弃置四张牌，若花色各不相同则视为对 %dest 使用【桃】",

  ["$chenqing1"] = "陈生死离别之苦，悲乱世之跌宕。",
  ["$chenqing2"] = "乱世陈情，字字血泪！",
}

chenqing:addEffect(fk.EnterDying, {
  anim_type = "support",
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(chenqing.name) and player:usedSkillTimes(chenqing.name, Player.HistoryRound) == 0 and
      table.find(player.room.alive_players, function(p)
        return p ~= player and p ~= target
      end)
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local targets = table.filter(room.alive_players, function(p)
      return p ~= player and p ~= target
    end)
    local to = room:askToChoosePlayers(player, {
      skill_name = chenqing.name,
      min_num = 1,
      max_num = 1,
      targets = targets,
      prompt = "#chenqing-choose::"..target.id,
      cancelable = true,
    })
    if #to > 0 then
      event:setCostData(self, {tos = to})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local to = event:getCostData(self).tos[1]
    to:drawCards(4, chenqing.name)
    if to.dead then return end
    local cards = room:askToDiscard(to, {
      min_num = 4,
      max_num = 4,
      include_equip = true,
      skill_name = chenqing.name,
      cancelable = false,
      prompt = "#chenqing-discard::"..target.id,
      skip = true,
    })
    local suits = {}
    for _, id in ipairs(cards) do
      table.insertIfNeed(suits, Fk:getCardById(id).suit)
    end
    table.removeOne(suits, Card.NoSuit)
    room:throwCard(cards, chenqing.name, to, to)
    if #suits == 4 and not target.dead then
      room:useVirtualCard("peach", nil, to, target, chenqing.name)
    end
  end,
})

return chenqing
