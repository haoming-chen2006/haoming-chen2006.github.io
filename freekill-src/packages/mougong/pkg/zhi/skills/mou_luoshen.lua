local mouLuoshen = fk.CreateSkill({
  name = "mou__luoshen",
})

Fk:loadTranslationTable{
  ["mou__luoshen"] = "洛神",
  [":mou__luoshen"] = "准备阶段，你可以选择一名角色，自其开始的X名其他角色依次展示一张手牌（X为场上存活角色数的一半，向上取整）："..
  "若为黑色，你获得之（这些牌不计入你本回合的手牌上限）；若为红色，其弃置之。",

  ["#mou__luoshen-choose"] = "发动洛神，选择一名其他角色作为起始角色",
  ["#mou__luoshen-show"] = "洛神：展示一张手牌，若为黑色则%src获得之，若为红色则弃置之",

  ["@@mou__luoshen-inhand-turn"] = "洛神",

  ["$mou__luoshen1"] = "商灵缤兮恭迎，伞盖纷兮若云。",
  ["$mou__luoshen2"] = "晨张兮细帷，夕茸兮兰櫋。",
}

mouLuoshen:addEffect(fk.EventPhaseStart, {
  anim_type = "drawcard",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(mouLuoshen.name) and player.phase == Player.Start
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local to = room:askToChoosePlayers(
      player,
      {
        targets = room:getOtherPlayers(player, false),
        min_num = 1,
        max_num = 1,
        prompt = "#mou__luoshen-choose",
        skill_name = mouLuoshen.name
      }
    )
    if #to > 0 then
      event:setCostData(self, to[1])
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    ---@type string
    local skillName = mouLuoshen.name
    local room = player.room
    local x = (#room.alive_players + 1) // 2
    local to = event:getCostData(self)
    local targets = { to }
    for _ = 2, x do
      to = to:getNextAlive(true)
      if to == player then
        to = to:getNextAlive(true)
      end
      table.insertIfNeed(targets, to)
    end
    room:doIndicate(player, table.map(targets, Util.IdMapper))
    for _, p in ipairs(targets) do
      if player.dead then break end
      if p:isAlive() and not p:isKongcheng() then
        local cards = room:askToCards(
          p,
          {
            min_num = 1,
            max_num = 1,
            skill_name = skillName,
            cancelable = false,
            prompt = "#mou__luoshen-show:" .. player.id
          }
        )
        p:showCards(cards)
        local card = Fk:getCardById(cards[1])
        if card.color == Card.Red then
          if not p:prohibitDiscard(card) then
            room:throwCard(cards, skillName, p, p)
          end
        elseif card.color == Card.Black then
          room:moveCardTo(cards, Card.PlayerHand, player, fk.ReasonPrey, skillName, "", true, player, "@@mou__luoshen-inhand-turn")
        end
      end
    end
  end,
})

mouLuoshen:addEffect("maxcards", {
  exclude_from = function(self, player, card)
    return card:getMark("@@mou__luoshen-inhand-turn") > 0
  end,
})

return mouLuoshen
