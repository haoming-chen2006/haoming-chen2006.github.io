
local fulin = fk.CreateSkill {
  name = "fulin",
  tags = { Skill.Compulsory },
}

Fk:loadTranslationTable{
  ["fulin"] = "腹鳞",
  [":fulin"] = "锁定技，弃牌阶段，你本回合获得的牌不计入手牌上限。",

  ["@@fulin-inhand-turn"] = "腹鳞",

  ["$fulin1"] = "丞相，丞相！你们没看见我吗？",
  ["$fulin2"] = "我乃托孤重臣，却在这儿搞什么粮草！"
}

fulin:addEffect("maxcards", {
  exclude_from = function(self, player, card)
    return player:hasSkill(fulin.name) and player.phase == Player.Discard and card:getMark("@@fulin-inhand-turn") > 0
  end,
})

fulin:addEffect(fk.AfterCardsMove, {
  can_refresh = function(self, event, target, player, data)
    if player:hasSkill(fulin.name, true) and player.room.current == player then
      for _, move in ipairs(data) do
        if move.to == player and move.toArea == Card.PlayerHand then
          return true
        end
      end
    end
  end,
  on_refresh = function(self, event, target, player, data)
    local room = player.room
    for _, move in ipairs(data) do
      if move.to == player and move.toArea == Card.PlayerHand then
        for _, info in ipairs(move.moveInfo) do
          if table.contains(player:getCardIds("h"), info.cardId) then
            room:setCardMark(Fk:getCardById(info.cardId), "@@fulin-inhand-turn", 1)
          end
        end
      end
    end
  end,
})

fulin:addEffect(fk.EventPhaseStart, {
  can_refresh = function(self, event, target, player, data)
    return target == player and player:hasSkill(fulin.name) and player.phase == Player.Discard and
      not player:isFakeSkill(fulin.name) and player:getMaxCards() < player:getHandcardNum() and
      table.find(player:getCardIds("h"), function (id)
        return Fk:getCardById(id):getMark("@@fulin-inhand-turn") > 0
      end)
  end,
  on_refresh = function(self, event, target, player, data)
    player:broadcastSkillInvoke(fulin.name)
    player.room:notifySkillInvoked(player, fulin.name, "defensive")
  end,
})

return fulin
