local cunmu = fk.CreateSkill {
  name = "cunmu",
  tags = {Skill.Compulsory},
}

Fk:loadTranslationTable{
  ["cunmu"] = "寸目",
  [":cunmu"] = "锁定技，当你摸牌时，改为从牌堆底摸牌。",

  ["$cunmu_xuyou1"] = "哼！目光所及，短寸之间。",
  ["$cunmu_xuyou2"] = "狭目之见，只能窥底。",
}

cunmu:addEffect(fk.BeforeDrawCard, {
  anim_type = "negative",
  on_use = function(self, event, target, player, data)
    data.fromPlace = "bottom"
  end,
})

cunmu:addTest(function (room, me)
  FkTest.runInRoom(function ()
    room:handleAddLoseSkills(me, cunmu.name)
  end)
  local card = room:printCard("slash", Card.Spade, 1)
  FkTest.runInRoom(function ()
    room:moveCards({
      ids = {card.id},
      moveReason = fk.ReasonJustMove,
      toArea = Card.DrawPile,
      drawPilePosition = -1,
    })
    me:drawCards(1, cunmu.name)
  end)
  lu.assertEquals(me:getCardIds(Player.Hand), {card.id})

  local iron_chain = room:printCard("iron_chain", Card.Spade, 1)
  FkTest.setNextReplies(me, {FkTest.ReplyUseSkill("recast", nil, {iron_chain.id})})
  FkTest.runInRoom(function ()
    room:moveCards({
      ids = {card.id},
      moveReason = fk.ReasonJustMove,
      fromArea = Card.PlayerHand,
      from = me,
      toArea = Card.DrawPile,
      drawPilePosition = -1,
    })
    me:gainAnExtraPhase(Player.Play)
  end)
end)

return cunmu
