local qinyin = fk.CreateSkill {
  name = "qinyin",
}

Fk:loadTranslationTable{
  ["qinyin"] = "琴音",
  [":qinyin"] = "弃牌阶段结束时，若你此阶段弃置过至少两张手牌，你可以选择：1.令所有角色各回复1点体力；2.令所有角色各失去1点体力。",

  ["#qinyin-choice"] = "琴音：是否令所有角色各回复或失去1点体力？",

  ["$qinyin1"] = "（急促的琴声、燃烧声）",
  ["$qinyin2"] = "（舒缓的琴声）",
}

qinyin:addEffect(fk.EventPhaseEnd, {
  mute = true,
  can_trigger = function(self, event, target, player, data)
    if target == player and player:hasSkill(qinyin.name) and player.phase == Player.Discard then
      local n = 0
      local logic = player.room.logic
      logic:getEventsOfScope(GameEvent.MoveCards, 1, function (e)
        for _, move in ipairs(e.data) do
          if move.from == player and move.moveReason == fk.ReasonDiscard then
            for _, info in ipairs(move.moveInfo) do
              if info.fromArea == Card.PlayerHand then
                n = n + 1
              end
            end
            if n > 1 then return true end
          end
        end
      end, Player.HistoryPhase)
      return n > 1
    end
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local choices = {"loseHp", "Cancel"}
    if not table.every(room.alive_players, function (p)
      return not p:isWounded()
    end) then
      table.insert(choices, 1, "recover")
    end
    local choice = room:askToChoice(player, {
      choices = choices,
      skill_name = qinyin.name,
      prompt = "#qinyin-choice",
      all_choices = {"loseHp", "recover", "Cancel"},
    })
    if choice ~= "Cancel" then
      event:setCostData(self, {tos = table.simpleClone(room.alive_players), choice = choice}) -- mute，所以tos也没有作用
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    if event:getCostData(self).choice == "recover" then
      room:notifySkillInvoked(player, qinyin.name, "support", table.simpleClone(room.alive_players))
      player:broadcastSkillInvoke(qinyin.name, 2)
      for _, p in ipairs(room:getAlivePlayers()) do
        if p:isWounded() and not p.dead then
          room:recover{
            who = p,
            num = 1,
            recoverBy = player,
            skillName = qinyin.name
          }
        end
      end
    else
      room:notifySkillInvoked(player, qinyin.name, "offensive", table.simpleClone(room.alive_players))
      player:broadcastSkillInvoke(qinyin.name, 1)
      for _, p in ipairs(room:getAlivePlayers()) do
        if not p.dead then
          room:loseHp(p, 1, qinyin.name, player)
        end
      end
    end
  end,
})

qinyin:addTest(function (room, me)
  FkTest.runInRoom(function()
    room:handleAddLoseSkills(me, qinyin.name)
  end)
  FkTest.setNextReplies(me, {json.encode {
    card = { skill = "discard_skill", subcards = { 1, 2 } },
    targets = {}
  }, "loseHp"})
  FkTest.runInRoom(function()
    room:obtainCard(me, {1, 2, 3, 4, 5, 6})
    me:gainAnExtraTurn(true, nil, {Player.Discard})
  end)
  lu.assertEquals(me.hp, 3)
  lu.assertEquals(room.players[2].hp, 3)

  FkTest.setNextReplies(me, {json.encode {
    card = { skill = "discard_skill", subcards = { 3, 4 } },
    targets = {}
  }, "recover"})
  FkTest.runInRoom(function()
    room:obtainCard(me, {1})
    me:gainAnExtraTurn(true, nil, {Player.Discard})
  end)
  lu.assertEquals(me.hp, 4)
  lu.assertEquals(room.players[2].hp, 4)
end)

return qinyin
