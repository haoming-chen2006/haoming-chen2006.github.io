local guidao = fk.CreateSkill({
  name = "guidao",
})

Fk:loadTranslationTable{
  ["guidao"] = "鬼道",
  [":guidao"] = "当一名角色的判定牌生效前，你可以打出一张黑色牌替换之。",

  ["#guidao-ask"] = "鬼道：你可以打出一张黑色牌替换 %dest 的“%arg”判定",

  ["$guidao1"] = "天下大势，为我所控。",
  ["$guidao2"] = "哼哼哼哼~",
}

guidao:addEffect(fk.AskForRetrial, {
  anim_type = "control",
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(guidao.name) and not player:isNude()
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local allIds = table.connect(player:getHandlyIds(), player:getCardIds("e"))
    local ids = table.filter(allIds, function (id)
      return not player:prohibitResponse(Fk:getCardById(id)) and Fk:getCardById(id).color == Card.Black
    end)
    local cards = room:askToCards(player, {
      min_num = 1,
      max_num = 1,
      skill_name = guidao.name,
      pattern = tostring( Exppattern{ id = ids } ),
      include_equip = true,
      prompt = "#guidao-ask::"..target.id..":"..data.reason,
      cancelable = true,
      expand_pile = table.filter(ids, function (id)
        return not table.contains(player:getCardIds("he"), id)
      end)
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
      skillName = guidao.name,
      response = true,
      exchange = true,
    }
  end,
})

return guidao
