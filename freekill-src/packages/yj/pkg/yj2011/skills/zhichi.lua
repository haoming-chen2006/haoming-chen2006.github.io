local zhichi = fk.CreateSkill {
  name = "zhichi",
  tags = { Skill.Compulsory },
}

Fk:loadTranslationTable{
  ["zhichi"] = "智迟",
  [":zhichi"] = "锁定技，你的回合外，当你受到伤害后，此回合【杀】和普通锦囊牌对你无效。",

  ["@@zhichi-turn"] = "智迟",

  ["$zhichi1"] = "如今之计，唯有退守，再做决断。",
  ["$zhichi2"] = "若吾，早知如此……",
}

zhichi:addEffect(fk.Damaged, {
  anim_type = "defensive",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(zhichi.name) and player.room.current ~= player
  end,
  on_use = function(self, event, target, player, data)
    player.room:setPlayerMark(player, "@@zhichi-turn", 1)
  end,
})

zhichi:addEffect(fk.PreCardEffect, {
  anim_type = "defensive",
  is_delay_effect = true,
  can_trigger = function(self, event, target, player, data)
    return data.to == player and player:usedSkillTimes(zhichi.name, Player.HistoryTurn) > 0 and
      (data.card.trueName == "slash" or data.card:isCommonTrick())
  end,
  on_use = function (self, event, target, player, data)
    data.nullified = true
  end,
})

zhichi:addTest(function (room, me)
  local comp2 = room.players[2]
  FkTest.runInRoom(function() room:handleAddLoseSkills(comp2, "zhichi") end)

  local slash = Fk:getCardById(1)
  FkTest.runInRoom(function()
    room:damage{
      to = comp2,
      damage = 1,
    }
    room:useCard{
      from = me,
      tos = { comp2 },
      card = slash,
    }
    room:useVirtualCard("duel", nil, me, comp2)
  end)
  lu.assertEquals(comp2.hp, 3)
end)

return zhichi