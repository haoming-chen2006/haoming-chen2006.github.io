local zhimeng = fk.CreateSkill {
  name = "js__zhimeng",
}

Fk:loadTranslationTable{
  ["js__zhimeng"] = "执盟",
  [":js__zhimeng"] = "准备阶段，你可以亮出牌堆顶存活角色数的牌，令所有角色同时展示一张手牌，展示不重复花色手牌的角色获得亮出牌中此花色的所有牌。",

  ["#js__zhimeng-display"] = "执盟：请展示一张手牌，若与其他角色展示的牌花色均不同，则你获得亮出牌中此花色的牌",
}

zhimeng:addEffect(fk.EventPhaseStart, {
  anim_type = "drawcard",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(zhimeng.name) and player.phase == Player.Start
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local cards = room:getNCards(#room.alive_players)
    room:turnOverCardsFromDrawPile(player, cards, zhimeng.name)
    room:delay(2000)

    local targets = table.filter(room.alive_players, function(p)
      return not p:isKongcheng()
    end)
    if #targets > 0 then
      local result = room:askToJointCards(player, {
        players = targets,
        min_num = 1,
        max_num = 1,
        include_equip = false,
        skill_name = zhimeng.name,
        cancelable = false,
        prompt = "#js__zhimeng-display",
      })

      local suits = {}
      for _, p in ipairs(targets) do
        local card = Fk:getCardById(result[p][1])
        suits[card:getSuitString()] = suits[card:getSuitString()] or {}
        table.insert(suits[card:getSuitString()], p)
        p:showCards(card)
      end
      room:delay(2000)

      local winners = {}
      local mapper = {}
      for suit, players in pairs(suits) do
        if #players == 1 then
          table.insert(winners, players[1])
          mapper[players[1]] = suit
        end
      end

      room:sortByAction(winners)
      for _, p in ipairs(winners) do
        local ids = table.filter(cards, function(id)
          return room:getCardArea(id) == Card.Processing and Fk:getCardById(id):getSuitString() == mapper[p]
        end)
        if #ids > 0 then
          room:obtainCard(p, ids, true, fk.ReasonJustMove, p, zhimeng.name)
        end
      end
    end
    room:cleanProcessingArea(cards)
  end,
})

return zhimeng
