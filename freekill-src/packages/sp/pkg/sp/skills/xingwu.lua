local xingwu = fk.CreateSkill {
  name = "xingwu",
  derived_piles = "xingwu",
}

Fk:loadTranslationTable {
  ["xingwu"] = "星舞",
  [":xingwu"] = "弃牌阶段开始时，你可以将一张与你本回合使用的牌颜色均不同的手牌置于武将牌上，然后若你武将牌上的牌达到三张，则弃置这些牌，"..
  "对一名男性角色造成2点伤害并弃置其装备区中的所有牌。",

  ["#xingwu-ask"] = "星舞：你可以将一张手牌置为“星舞”牌",
  ["#xingwu-choose"] = "星舞：对一名男性角色造成2点伤害并弃置其装备区所有牌",

  ["$xingwu1"] = "哼，不要小瞧女孩子哦！",
  ["$xingwu2"] = "姐妹齐心，其利断金。",
}

xingwu:addEffect(fk.EventPhaseStart, {
  anim_type = "offensive",
  can_trigger = function(self, event, target, player, data)
    if target == player and player:hasSkill(xingwu.name) and player.phase == Player.Discard and
      not player:isKongcheng() then
      local colors = {}
      player.room.logic:getEventsOfScope(GameEvent.UseCard, 1, function (e)
        local use = e.data
        if use.from == player then
          table.insertIfNeed(colors, use.card.color)
        end
      end, Player.HistoryTurn)
      table.removeOne(colors, Card.NoColor)
      if #colors < 2 then
        event:setCostData(self, {extra_data = colors})
        return true
      end
    end
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local colors = event:getCostData(self).extra_data
    local pattern = "."
    if #colors == 1 then
      if colors[1] == Card.Black then
        pattern = ".|.|heart,diamond"
      else
        pattern = ".|.|spade,club"
      end
    end
    local card = room:askToCards(player, {
      skill_name = xingwu.name,
      min_num = 1,
      max_num = 1,
      include_equip = false,
      pattern = pattern,
      prompt = "#xingwu-ask",
      cancelable = true,
    })
    if #card > 0 then
      event:setCostData(self, {cards = card})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    player:addToPile(xingwu.name, event:getCostData(self).cards, true, xingwu.name)
    if player.dead then return end
    if #player:getPile(xingwu.name) > 2 then
      room:moveCardTo(player:getPile(xingwu.name), Card.DiscardPile, nil, fk.ReasonPutIntoDiscardPile, xingwu.name, nil, true)
      if player.dead then return end
      local targets = table.filter(room:getOtherPlayers(player, false), function(p)
        return p:isMale()
      end)
      if #targets == 0 then return end
      local to = room:askToChoosePlayers(player, {
        skill_name = xingwu.name,
        min_num = 1,
        max_num = 1,
        targets = targets,
        prompt = "#xingwu-choose",
        cancelable = false,
      })[1]
      room:damage {
        from = player,
        to = to,
        damage = 2,
        skillName = xingwu.name,
      }
      if not to.dead then
        to:throwAllCards("e", xingwu.name)
      end
    end
  end,
})

return xingwu
