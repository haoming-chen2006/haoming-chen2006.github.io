local mouKurou = fk.CreateSkill({
  name = "mou__kurou",
})

Fk:loadTranslationTable{
  ["mou__kurou"] = "苦肉",
  ["#mou__kurou_hujia"] = "苦肉",
  [":mou__kurou"] = "①出牌阶段开始时，你可以将一张牌交给一名其他角色，若如此做，你失去1点体力，若你交出的牌为【桃】或【酒】则改为2点；" ..
  "②当你失去1点体力值时，你获得2点护甲。",

  ["#mou__kurou-give"] = "苦肉：你可以将一张手牌交给一名其他角色，你失去1点体力，若交出【桃】或【酒】则改为2点",

  ["$mou__kurou1"] = "既不能破，不如依张子布之言，投降便罢！",
  ["$mou__kurou2"] = "周瑜小儿！破曹不得，便欺吾三世老臣乎？",
}

mouKurou:addEffect(fk.EventPhaseStart, {
  anim_type = "control",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(mouKurou.name) and player.phase == Player.Play
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local tar, card = room:askToChooseCardsAndPlayers(
      player,
      {
        targets = room:getOtherPlayers(player, false),
        min_num = 1,
        max_num = 1,
        min_card_num = 1,
        max_card_num = 1,
        prompt = "#mou__kurou-give",
        skill_name = mouKurou.name,
      }
    )
    if #tar > 0 and #card > 0 then
      event:setCostData(self, { tar[1], card[1] })
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    ---@type string
    local skillName = mouKurou.name
    local room = player.room
    local costData = event:getCostData(self)
    local card = Fk:getCardById(costData[2])
    room:obtainCard(costData[1], card, false, fk.ReasonGive)
    if player.dead then return end
    if card.trueName == "analeptic" or card.trueName == "peach" then
      room:loseHp(player, 2, skillName)
    else
      room:loseHp(player, 1, skillName)
    end
  end,
})

mouKurou:addEffect(fk.HpLost, {
  trigger_times = function (self, event, target, player, data)
    return data.num
  end,
  on_cost = Util.TrueFunc,
  on_use = function(self, event, target, player, data)
    player.room:changeShield(player, 2)
  end,
})

return mouKurou
