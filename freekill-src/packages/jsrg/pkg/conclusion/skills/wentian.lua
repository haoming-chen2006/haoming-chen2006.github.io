local wentian = fk.CreateSkill {
  name = "wentian",
}

Fk:loadTranslationTable{
  ["wentian"] = "问天",
  [":wentian"] = "你可以将牌堆顶的牌当【无懈可击】/【火攻】使用，若此牌不为黑色/红色，此技能于本轮内失效；"..
  "每回合限一次，你的任意阶段开始时，你可以观看牌堆顶五张牌，然后将其中一张牌交给一名其他角色，其余牌以任意顺序置于牌堆顶或牌堆底。",

  ["#wentian"] = "问天：将牌堆顶牌当【无懈可击】/【火攻】使用，若不为黑色/红色，“问天”本轮失效",
  ["#wentian-ask"] = "问天：是否发动“问天”，观看牌堆顶五张牌并将其中一张牌交给一名其他角色（当前为%arg）",
  ["#wentian-give"] = "问天：请将其中一张牌交给一名其他角色",
}

wentian:addEffect("viewas", {
  mute = true,
  pattern = "fire_attack,nullification",
  prompt = "#wentian",
  interaction = function(self, player)
    local all_names = { "fire_attack", "nullification" }
    local names = player:getViewAsCardNames(wentian.name, all_names)
    if #names > 0 then
      return UI.CardNameBox { choices = names, all_choices = all_names }
    end
  end,
  card_filter = Util.FalseFunc,
  view_as = function(self, player, cards)
    if #cards ~= 0 or not self.interaction.data then return end
    local card = Fk:cloneCard(self.interaction.data)
    card.skillName = wentian.name
    return card
  end,
  before_use = function(self, player, use)
    local room = player.room
    local id = room:getNCards(1)[1]
    use.card:addSubcard(id)
    local color = Fk:getCardById(id).color
    player:broadcastSkillInvoke(wentian.name)
    if use.card.name == "nullification" then
      room:notifySkillInvoked(player, wentian.name, "control")
      if color ~= Card.Black then
        room:invalidateSkill(player, wentian.name, "-round")
      end
    else
      room:notifySkillInvoked(player, wentian.name, "offensive")
      if color ~= Card.Red then
        room:invalidateSkill(player, wentian.name, "-round")
      end
    end
  end,
  enabled_at_response = function(self, player, response)
    return not response
  end,
})

wentian:addEffect(fk.EventPhaseStart, {
  anim_type = "control",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(wentian.name) and
      player:usedEffectTimes(self.name, Player.HistoryTurn) == 0 and
      player.phase >= Player.Start and player.phase <= Player.Finish
  end,
  on_cost = function(self, event, target, player, data)
    return player.room:askToSkillInvoke(player, {
      skill_name = wentian.name,
      prompt = "#wentian-ask:::" .. Util.PhaseStrMapper(player.phase),
    })
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local cards = room:getNCards(5)
    room:turnOverCardsFromDrawPile(player, cards, wentian.name, false)

    if #room:getOtherPlayers(player, false) > 0 then
      local to, card = room:askToChooseCardsAndPlayers(player, {
        min_card_num = 1,
        max_card_num = 1,
        min_num = 1,
        max_num = 1,
        targets = room:getOtherPlayers(player, false),
        pattern = tostring(Exppattern{ id = cards }),
        skill_name = wentian.name,
        prompt = "#wentian-give",
        cancelable = false,
        expand_pile = cards,
      })
      table.removeOne(cards, card[1])
      room:moveCardTo(card, Card.PlayerHand, to[1], fk.ReasonGive, wentian.name, nil, false, player)
      if player.dead then
        room:cleanProcessingArea(cards, wentian.name)
        return
      end
    end

    local result = room:askToGuanxing(player, {
      cards = cards,
      skill_name = wentian.name,
      skip = true,
    })
    room:sendLog{
      type = "#GuanxingResult",
      from = player.id,
      arg = #result.top,
      arg2 = #result.bottom,
    }
    local moves = {}
    if #result.top > 0 then
      table.insert(moves, {
        ids = table.reverse(result.top),
        toArea = Card.DrawPile,
        moveReason = fk.ReasonJustMove,
        skillName = wentian.name,
        proposer = player,
        moveVisible = false,
        visiblePlayers = player,
        drawPilePosition = 1
      })
    end
    if #result.bottom > 0 then
      table.insert(moves, {
        ids = result.bottom,
        toArea = Card.DrawPile,
        moveReason = fk.ReasonJustMove,
        skillName = wentian.name,
        proposer = player,
        moveVisible = false,
        visiblePlayers = player,
        drawPilePosition = -1
      })
    end
    room:moveCards(table.unpack(moves))
  end,
})

return wentian
