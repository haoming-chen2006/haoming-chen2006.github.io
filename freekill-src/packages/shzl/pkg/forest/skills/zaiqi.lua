local zaiqi = fk.CreateSkill {
  name = "zaiqi",
}

Fk:loadTranslationTable{
  ["zaiqi"] = "再起",
  [":zaiqi"] = "摸牌阶段，若你已受伤，你可以放弃摸牌，改为亮出牌堆顶X张牌（X为你已损失体力值），你将其中的<font color='red'>♥</font>牌置入弃牌堆"..
  "并回复等量体力，获得其余的牌。",

  ["$zaiqi1"] = "丞相助我！",
  ["$zaiqi2"] = "起！",
}

zaiqi:addEffect(fk.EventPhaseStart, {
  anim_type = "support",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(zaiqi.name) and player.phase == Player.Draw and not data.phase_end and player:isWounded()
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    data.phase_end = true
    local n = player:getLostHp()
    local cards = room:getNCards(n)
    room:moveCards{
      ids = cards,
      toArea = Card.Processing,
      moveReason = fk.ReasonJustMove,
      skillName = zaiqi.name,
      proposer = player,
    }
    room:delay(2000)
    local hearts, to_get = {}, {}
    for _, id in ipairs(cards) do
      if Fk:getCardById(id).suit == Card.Heart then
        table.insert(hearts, id)
      else
        table.insert(to_get, id)
      end
    end
    if #hearts > 0 then
      if player:isWounded() then
        room:recover({
          who = player,
          num = math.min(#hearts, player.maxHp - player.hp),
          recoverBy = player,
          skillName = zaiqi.name,
        })
      end
      room:cleanProcessingArea(hearts)
    end
    if #to_get > 0 and not player.dead then
      room:obtainCard(player, to_get, true, fk.ReasonJustMove, player, zaiqi.name)
    end
    room:cleanProcessingArea(cards)
  end,
})

return zaiqi
