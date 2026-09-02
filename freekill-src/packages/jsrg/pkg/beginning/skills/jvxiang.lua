local jvxiang = fk.CreateSkill {
  name = "jvxiang",
}

Fk:loadTranslationTable{
  ["jvxiang"] = "拒降",
  [":jvxiang"] = "当你于摸牌阶段外获得牌后，你可以弃置这些牌，令当前回合角色于本回合出牌阶段使用【杀】次数上限+X（X为你此次弃置牌的花色数）。",

  ["#jvxiang-invoke"] = "拒降：是否弃置这些牌，令 %dest 本回合使用【杀】次数上限增加？",
}

jvxiang:addEffect(fk.AfterCardsMove, {
  anim_type = "offensive",
  can_trigger = function(self, event, target, player, data)
    if player:hasSkill(jvxiang.name) then
      for _, move in ipairs(data) do
        if move.to and move.to == player and move.toArea == Player.Hand and player.phase ~= Player.Draw then
          return true
        end
      end
    end
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    if room:askToSkillInvoke(player, {
      skill_name = jvxiang.name,
      prompt = "#jvxiang-invoke::"..room.current.id,
    }) then
      event:setCostData(self, {tos = {room.current}})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local cards = {}
    local suits = {}
    for _, move in ipairs(data) do
      if move.to == player and move.toArea == Player.Hand and player.phase ~= Player.Draw then
        for _, info in ipairs(move.moveInfo) do
          if table.contains(player:getCardIds("h"), info.cardId) and not player:prohibitDiscard(info.cardId) then
            table.insertIfNeed(cards, info.cardId)
            table.insertIfNeed(suits, Fk:getCardById(info.cardId).suit)
          end
        end
      end
    end
    table.removeOne(suits, Card.NoSuit)
    if #cards > 0 then
      room:throwCard(cards, jvxiang.name, player, player)
    end
    if not room.current.dead and #suits > 0 then
      room:addPlayerMark(room.current, MarkEnum.SlashResidue.."-turn", #suits)
    end
  end,
})

return jvxiang
