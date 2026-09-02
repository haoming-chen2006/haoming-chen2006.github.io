
local qianxun = fk.CreateSkill{
  name = "ex__qianxun",
}

Fk:loadTranslationTable{
  ["ex__qianxun"] = "谦逊",
  [":ex__qianxun"] = "当一张延时锦囊牌或其他角色使用的普通锦囊牌对你生效时，若你是此牌唯一目标，则你可以将所有手牌扣置于武将牌上，"..
  "然后此回合结束时，你获得这些牌。",

  ["$ex__qianxun"] = "谦逊",

  ["$ex__qianxun1"] = "满招损，谦受益。",
  ["$ex__qianxun2"] = "谦谦君子，温润如玉。",
}

qianxun:addEffect(fk.CardEffecting, {
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(qianxun.name) and
      data.from ~= player and data.card.type == Card.TypeTrick and
      data:isOnlyTarget(player) and not player:isKongcheng()
  end,
  on_use = function(self, event, target, player, data)
    player:addToPile("$ex__qianxun", player:getCardIds("h"), false, qianxun.name)
  end,
})

qianxun:addEffect(fk.TurnEnd, {
  mute = true,
  is_delay_effect = true,
  can_trigger = function(self, event, target, player, data)
    return #player:getPile("$ex__qianxun") > 0
  end,
  on_use = function(self, event, target, player, data)
    player.room:obtainCard(player, player:getPile("$ex__qianxun"), false)
  end,
})

qianxun:addTest(function(room, me)
  local comp2 = room.players[2]
  FkTest.runInRoom(function()
    room:handleAddLoseSkills(me, "ex__qianxun")
    room:obtainCard(me, {1, 2, 3, 4})
  end)
  FkTest.setNextReplies(me, { "1" })
  FkTest.runInRoom(function()
    room:useCard{
      from = comp2,
      tos = { me },
      card = room:printCard("snatch"),
    }
  end)
  lu.assertEquals(#me:getCardIds("h"), 0)
  lu.assertEquals(#comp2:getCardIds("h"), 0)
  FkTest.runInRoom(function()
    GameEvent.Turn:create(TurnData:new(me, "game_rule", { Player.Finish })):exec()
  end)
  lu.assertEquals(#me:getCardIds("h"), 4)
end)

return qianxun
