
Fk:loadTranslationTable{
  ["ex__luoyi"] = "裸衣",
  [":ex__luoyi"] = "摸牌阶段开始前，你可以亮出牌堆顶的三张牌，然后你可以跳过摸牌阶段并获得其中所有基本牌、武器牌和【决斗】，"..
    "且直到你的下回合开始，你为伤害来源的【杀】和【决斗】对目标角色造成的伤害+1。",

  ["@@ex__luoyi"] = "裸衣",
  ["#ex__luoyi-ask"] = "裸衣：是否跳过摸牌，获得其中的基本牌、武器和【决斗】，造成伤害+1？",

  ["$ex__luoyi1"] = "过来打一架，对，就是你！",
  ["$ex__luoyi2"] = "废话少说，放马过来吧！",
}

local luoyi = fk.CreateSkill{
  name = "ex__luoyi",
}

luoyi:addEffect(fk.EventPhaseChanging, {
  anim_type = "offensive",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(luoyi.name) and data.phase == Player.Draw and not data.skipped
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local cids = room:getNCards(3)
    room:turnOverCardsFromDrawPile(player, cids, luoyi.name)
    local cards = table.filter(cids, function(id)
      local card = Fk:getCardById(id)
      return card.type == Card.TypeBasic or card.sub_type == Card.SubtypeWeapon or card.name == "duel"
    end)
    if room:askToSkillInvoke(player, {
        skill_name = luoyi.name,
        prompt = "#ex__luoyi-ask",
      }) then
      room:obtainCard(player, cards, true, fk.ReasonJustMove, player)
      if not player.dead then
        room:addPlayerMark(player, "@@ex__luoyi")
      end
      data.skipped = true
    end
    room:cleanProcessingArea(cids)
  end,
})

luoyi:addEffect(fk.TurnStart, {
  can_refresh = function(self, event, target, player, data)
    return target == player
  end,
  on_refresh = function(self, event, target, player, data)
    player.room:setPlayerMark(player, "@@ex__luoyi", 0)
  end,
})

luoyi:addEffect(fk.DamageCaused, {
  anim_type = "offensive",
  is_delay_effect = true,
  mute = true,
  can_trigger = function(self, event, target, player, data)
    return target == player and player:getMark("@@ex__luoyi") > 0 and
      data.card and (data.card.trueName == "slash" or data.card.name == "duel") and
      player.room.logic:damageByCardEffect(false)
  end,
  on_use = function(self, event, target, player, data)
    data:changeDamage(1)
  end,
})

luoyi:addTest(function(room, me)
  local comp2 = room.players[2] ---@type ServerPlayer, ServerPlayer
  FkTest.runInRoom(function()
    room:handleAddLoseSkills(me, luoyi.name)
  end)
  local slash = Fk:getCardById(1)
  FkTest.setNextReplies(me, { json.encode {
    cards = {},
    choice = "ex__luoyi_get"
  }, json.encode {
    card = 1,
    targets = { comp2.id }
  } })
  FkTest.setNextReplies(comp2, { "__cancel" })

  local origin_hp = comp2.hp
  FkTest.runInRoom(function()
    room:obtainCard(me, 1)
    GameEvent.Turn:create(TurnData:new(me, "game_rule")):exec()
  end)
  -- p(me:getCardIds("h"))
  -- lu.assertEquals(#me:getCardIds("h"), 1)
  lu.assertEquals(comp2.hp, origin_hp - 2)

  -- 测标记持续时间
  origin_hp = comp2.hp
  FkTest.runInRoom(function()
    room:useCard{
      from = me,
      tos = { comp2 },
      card = slash,
    }
  end)
  lu.assertEquals(comp2.hp, origin_hp - 1)
end)

return luoyi
