local shefu = fk.CreateSkill {
  name = "sx__shefu&",
  derived_piles = "$sx__shefu",
}

Fk:loadTranslationTable{
  ["sx__shefu&"] = "设伏",
  [":sx__shefu&"] = "结束阶段，你可以扣置一张牌为“伏兵”；其他角色于你的回合外使用手牌时，你可以移去一张颜色和类别均相同的“伏兵”，令此牌无效。",

  ["$sx__shefu"] = "伏兵",
  ["#sx__shefu-put"] = "设伏：你可以将一张牌扣置为“设伏”牌",
  ["#sx__shefu-invoke"] = "设伏：是否移去颜色类别与%arg相同的“设伏”牌，令 %dest 使用的此牌无效？",
}

shefu:addEffect(fk.EventPhaseStart, {
  anim_type = "control",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(shefu.name) and player.phase == Player.Finish and
      not player:isNude()
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local cards = room:askToCards(player, {
      min_num = 1,
      max_num = 1,
      include_equip = true,
      skill_name = shefu.name,
      prompt = "#sx__shefu-put",
      cancelable = true,
    })
    if #cards > 0 then
      event:setCostData(self, {cards = cards})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    player:addToPile("$sx__shefu", event:getCostData(self).cards, false, shefu.name, player)
  end,
})

shefu:addEffect(fk.CardUsing, {
  anim_type = "control",
  can_trigger = function(self, event, target, player, data)
    return target ~= player and data:isUsingHandcard(target) and player.room.current ~= player and
      table.find(player:getPile("$sx__shefu"), function (id)
        return Fk:getCardById(id):compareColorWith(data.card) and Fk:getCardById(id).type == data.card.type
      end)
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local ids = table.filter(player:getPile("$sx__shefu"), function (id)
        return Fk:getCardById(id):compareColorWith(data.card) and Fk:getCardById(id).type == data.card.type
      end)
    local cards = room:askToCards(player, {
      min_num = 1,
      max_num = 1,
      include_equip = false,
      skill_name = shefu.name,
      pattern = tostring(Exppattern{ id = ids }),
      prompt = "#sx__shefu-invoke::"..target.id..":"..data.card:toLogString(),
      cancelable = true,
      expand_pile = "$sx__shefu",
    })
    if #cards > 0 then
      event:setCostData(self, {tos = {target}, cards = cards})
      return true
    end
  end,
  on_use = function (self, event, target, player, data)
    local room = player.room
    room:moveCardTo(event:getCostData(self).cards, Card.DiscardPile, nil, fk.ReasonPutIntoDiscardPile, shefu.name, nil, true, player)
    data.toCard = nil
    data.nullifiedTargets = table.simpleClone(player.room.players)
  end,
})

return shefu
