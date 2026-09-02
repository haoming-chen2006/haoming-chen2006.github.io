local lianzhu = fk.CreateSkill {
  name = "js__lianzhu",
}

Fk:loadTranslationTable{
  ["js__lianzhu"] = "连诛",
  [":js__lianzhu"] = "出牌阶段限一次，你可以展示一张黑色手牌并交给一名其他角色，然后视为你对所有势力与其相同的其他角色各使用一张【过河拆桥】。",

  ["#js__lianzhu"] = "连诛：将一张黑色手牌交给一名角色，视为对所有势力与其相同的角色使用【过河拆桥】",
}

lianzhu:addEffect("active", {
  anim_type = "control",
  prompt = "#js__lianzhu",
  card_num = 1,
  target_num = 1,
  can_use = function(self, player)
    return player:usedSkillTimes(lianzhu.name, Player.HistoryPhase) == 0
  end,
  card_filter = function(self, player, to_select, selected)
    return #selected == 0 and Fk:getCardById(to_select).color == Card.Black and table.contains(player:getCardIds("h"), to_select)
  end,
  target_filter = function(self, player, to_select, selected)
    return #selected == 0 and to_select ~= player
  end,
  on_use = function(self, room, effect)
    local player = effect.from
    local target = effect.tos[1]
    player:showCards(effect.cards)
    if player.dead or target.dead then return end
    if table.contains(player:getCardIds("h"), effect.cards[1]) then
      room:moveCardTo(effect.cards, Card.PlayerHand, target, fk.ReasonGive, lianzhu.name, nil, false, player)
    end
    for _, p in ipairs(room:getOtherPlayers(player)) do
      if p.kingdom == target.kingdom and not p:isAllNude() and not player.dead then
        room:useVirtualCard("dismantlement", nil, player, p, lianzhu.name)
      end
    end
  end,
})

return lianzhu
