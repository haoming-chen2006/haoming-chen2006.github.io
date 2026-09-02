local congjian = fk.CreateSkill {
  name = "congjian",
}

Fk:loadTranslationTable{
  ["congjian"] = "从谏",
  [":congjian"] = "当你成为锦囊牌的目标后，若此牌的目标数大于1，则你可以交给其中一名其他目标角色一张牌，然后摸一张牌，若你给出的是装备牌，"..
  "改为摸两张牌。",

  ["#congjian-give"] = "从谏：你可以将一张牌交给另一名目标角色并摸一张牌，若交出装备牌，改为摸两张",

  ["$congjian1"] = "听君谏言，去危亡，保宗祀!",
  ["$congjian2"] = "从谏良计，可得自保！",
}

congjian:addEffect(fk.TargetConfirmed, {
  anim_type = "defensive",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(congjian.name) and data.card.type == Card.TypeTrick and not player:isNude() and
      table.find(data.use.tos, function(p)
        return p ~= player and not p.dead
      end)
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local tos, cards = room:askToChooseCardsAndPlayers(player, {
      min_card_num = 1,
      max_card_num = 1,
      min_num = 1,
      max_num = 1,
      targets = table.filter(data.use.tos, function(p) return p ~= player end),
      skill_name = congjian.name,
      prompt = "#congjian-give",
      cancelable = true,
    })
    if #tos > 0 and #cards > 0 then
      event:setCostData(self, {tos = tos, cards = cards})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local x = Fk:getCardById(event:getCostData(self).cards[1]).type == Card.TypeEquip and 2 or 1
    room:obtainCard(event:getCostData(self).tos[1], event:getCostData(self).cards, true, fk.ReasonGive, player, congjian.name)
    if not player.dead then
      player:drawCards(x, congjian.name)
    end
  end,
})

return congjian
