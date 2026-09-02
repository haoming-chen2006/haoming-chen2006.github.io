
local huanshi = fk.CreateSkill({
  name = "mou__huanshi",
})

Fk:loadTranslationTable{
  ["mou__huanshi"] = "缓释",
  [":mou__huanshi"] = "当一名角色的判定牌生效前，你观看牌堆顶的一张牌，然后你可以用此牌或一张手牌替换之。",

  ["#mou__huanshi-ask"] = "缓释：你可以用手牌或牌堆顶牌替换 %dest 的“%arg”判定%arg2",

  ["$mou__huanshi1"] = "济危以仁，泽国生春。",
  ["$mou__huanshi2"] = "谏而不犯，正而不毅。",
}

huanshi:addEffect(fk.AskForRetrial, {
  anim_type = "control",
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(huanshi.name)
  end,
  on_cost = function(self, event, target, player, data)
    event:setCostData(self, { tos = { target } })
    return true
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local card = room:getNCards(1)
    local cards = room:askToCards(player, {
      min_num = 1,
      max_num = 1,
      include_equip = false,
      skill_name = huanshi.name,
      pattern = ".",
      prompt = "#mou__huanshi-ask::" .. target.id .. ":" .. data.reason .. ":" .. data.card:toLogString(),
      expand_pile = card,
    })
    if #cards == 0 then return end
    if cards[1] == card[1] then
      local newId = card[1]
      local oldId = data.card:getEffectiveId()
      card = Fk:getCardById(newId)
      room:moveCardTo(cards, Card.Processing, nil, fk.ReasonJustMove, huanshi.name, nil, true, player)
      data.card = card
      room:sendLog{
        type = "#ChangedJudge",
        from = player.id,
        to = { data.who.id },
        arg2 = card,
        arg = huanshi.name,
      }
      data.card = room:filterCard(newId, data.who, true)
      room:moveCards{
        ids = { oldId },
        toArea = Card.DrawPile,
        moveReason = fk.ReasonJudge,
        skillName = huanshi.name,
        drawPilePosition = 1,
      }
    else
      room:changeJudge{
        card = Fk:getCardById(cards[1]),
        player = player,
        data = data,
        skillName = huanshi.name,
        response = false,
        exchange = true,
      }
    end
  end,
})

return huanshi
