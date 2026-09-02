local shacheng = fk.CreateSkill {
  name = "shacheng",
  derived_piles = "shacheng",
}

Fk:loadTranslationTable{
  ["shacheng"] = "沙城",
  [":shacheng"] = "游戏开始时，你将牌堆顶的两张牌置于你的武将牌上；当一名角色使用一张【杀】结算后，你可以移去武将牌上的一张牌，"..
  "令其中一名目标角色摸X张牌（X为该目标本回合失去的牌数且至多为5）。",

  ["#shacheng-choose"] = "沙城：你可以移去一张“沙城”，令其中一名目标摸其本回合失去牌数的牌",
  ["#shacheng_tip"] = "摸%arg张牌",
}

shacheng:addEffect(fk.GameStart, {
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(shacheng.name)
  end,
  on_cost = Util.TrueFunc,
  on_use = function(self, event, target, player, data)
    player:addToPile(shacheng.name, player.room:getNCards(2), true, shacheng.name)
  end,
})

Fk:addTargetTip{
  name = "shacheng",
  target_tip = function(self, player, to_select, selected, selected_cards, card, selectable, extra_data)
    if not selectable then return end
    return "#shacheng_tip:::"..extra_data.extra_data[tostring(to_select.id)]
  end,
}

shacheng:addEffect(fk.CardUseFinished, {
  anim_type = "support",
  can_trigger = function(self, event, target, player, data)
    if player:hasSkill(shacheng.name) and data.card.trueName == "slash" and #player:getPile(shacheng.name) > 0 then
      local dat = {}
      player.room.logic:getEventsOfScope(GameEvent.MoveCards, 1, function(e)
        for _, move in ipairs(e.data) do
          if move.from and table.contains(data.tos, move.from) and not move.from.dead then
            for _, info in ipairs(move.moveInfo) do
              if info.fromArea == Card.PlayerHand or info.fromArea == Card.PlayerEquip then
                dat[tostring(move.from.id)] = (dat[tostring(move.from.id)] or 0) + 1
              end
            end
          end
        end
      end, Player.HistoryTurn)
      if next(dat) then
        event:setCostData(self, {extra_data = dat})
        return true
      end
    end
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local dat = event:getCostData(self).extra_data
    local targets = {}
    for id, _ in pairs(dat) do
      table.insert(targets, room:getPlayerById(tonumber(id)))
    end
    local to, cards = room:askToChooseCardsAndPlayers(player, {
      min_card_num = 1,
      max_card_num = 1,
      min_num = 1,
      max_num = 1,
      targets = targets,
      pattern = ".|.|.|shacheng",
      skill_name = shacheng.name,
      prompt = "#shacheng-choose",
      cancelable = true,
      expand_pile = shacheng.name,
      target_tip_name = shacheng.name,
      extra_data = dat,
    })
    if #to > 0 and #cards > 0 then
      event:setCostData(self, {tos = to, cards = cards, choice = dat[tostring(to[1].id)]})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local to = event:getCostData(self).tos[1]
    room:moveCardTo(event:getCostData(self).cards, Card.DiscardPile, player, fk.ReasonJustMove, shacheng.name, shacheng.name, true, player)
    if to.dead then return end
    local n = math.min(event:getCostData(self).choice, 5)
    to:drawCards(n, shacheng.name)
  end,
})

return shacheng
