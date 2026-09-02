
local guicai = fk.CreateSkill{
  name = "ex__guicai",
}

Fk:loadTranslationTable{
  ["ex__guicai"] = "鬼才",
  [":ex__guicai"] = "当判定结果确定前，你可打出一张牌代替之。",

  ["#ex__guicai-ask"] = "鬼才：你可以打出一张牌代替 %dest 的“%arg”判定",

  ["$ex__guicai1"] = "天命难违？哈哈哈哈哈……",
  ["$ex__guicai2"] = "才通天地，逆天改命！",
}

guicai:addEffect(fk.AskForRetrial, {
  guicai = "control",
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(guicai.name) and not player:isNude()
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local ids = table.filter(table.connect(player:getHandlyIds(), player:getCardIds("e")), function (id)
      return not player:prohibitResponse(Fk:getCardById(id))
    end)
    local cards = room:askToCards(player, {
      min_num = 1,
      max_num = 1,
      skill_name = guicai.name,
      include_equip = true,
      pattern = tostring(Exppattern{ id = ids }),
      prompt = "#ex__guicai-ask::"..target.id..":"..data.reason,
      expand_pile = player:getHandlyIds(false),
      cancelable = true,
    })
    if #cards > 0 then
      event:setCostData(self, {cards = cards})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    player.room:changeJudge{
      card = Fk:getCardById(event:getCostData(self).cards[1]),
      player = player,
      data = data,
      skillName = guicai.name,
      response = true,
    }
  end,
})

return guicai
