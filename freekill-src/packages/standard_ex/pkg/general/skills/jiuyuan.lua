Fk:loadTranslationTable{
  ["ex__jiuyuan"] = "救援",
  [":ex__jiuyuan"] = "主公技，当体力值大于你的吴势力角色使用【桃】指定自己为目标时，若你已受伤，其可以将此【桃】转移给你，然后其摸一张牌。",

  ["#ex__jiuyuan-ask"] = "救援：你可以将【桃】转移给 %dest，然后你摸一张牌",

  ["$ex__jiuyuan1"] = "你们真是朕的得力干将。",
  ["$ex__jiuyuan2"] = "有爱卿在，朕无烦忧。",
}

local jiuyuan = fk.CreateSkill{
  name = "ex__jiuyuan",
  tags = { Skill.Lord },
}

jiuyuan:addEffect(fk.TargetSpecifying, {
  anim_type = "support",
  can_trigger = function(self, event, target, player, data)
    return target ~= player and player:hasSkill(jiuyuan.name) and
      data.card.name == "peach" and target.kingdom == "wu" and data.to == target and not data.cancelled and
      target.hp >= player.hp and player:isWounded()
  end,
  on_cost = function(self, event, target, player, data)
    return player.room:askToSkillInvoke(target, {
      skill_name = jiuyuan.name,
      prompt = "#ex__jiuyuan-ask::"..player.id,
    })
  end,
  on_use = function(self, event, target, player, data)
    if data:cancelCurrentTarget() then
      data:addTarget(player)
      target:drawCards(1, jiuyuan.name)
    end
  end,
})

jiuyuan:addTest(function(room, me)
  local comp2 = room.players[2] ---@type ServerPlayer
  FkTest.runInRoom(function()
    room:handleAddLoseSkills(me, jiuyuan.name)
    room:changeKingdom(comp2, "shu")
  end)
  FkTest.runInRoom(function()
    room:loseHp(me, 2)
    room:loseHp(comp2, 1)
  end)
  local hp1 = me.hp
  local hp2 = comp2.hp
  FkTest.setNextReplies(comp2, { "1", "1" })

  local peach = room:printCard("peach")
  FkTest.runInRoom(function()
    room:useCard{
      from = comp2,
      tos = { comp2 },
      card = peach,
    }
  end)

  lu.assertEquals(me.hp, hp1)
  lu.assertEquals(comp2.hp, hp2 + 1)
  lu.assertEquals(#comp2:getCardIds("h"), 0)

  hp1 = me.hp
  hp2 = comp2.hp

  FkTest.runInRoom(function()
    room:changeKingdom(comp2, "wu")
  end)

  FkTest.runInRoom(function()
    room:useCard{
      from = comp2,
      tos = { comp2 },
      card = peach,
    }
  end)

  lu.assertEquals(me.hp, hp1 + 1)
  lu.assertEquals(comp2.hp, hp2)
  lu.assertEquals(#comp2:getCardIds("h"), 1)
end)

return jiuyuan
