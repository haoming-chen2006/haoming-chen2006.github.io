Fk:loadTranslationTable{
  ["yajiao"] = "涯角",
  [":yajiao"] = "当你于回合外使用或打出牌时，你可以展示牌堆顶的一张牌，将之交给一名角色，若这两张牌类别不同，你弃置一张牌。",

  ["#yajiao-card"] = "涯角：将%arg交给一名角色",

  ["$yajiao1"] = "遍寻天下，但求一败！",
  ["$yajiao2"] = "策马驱前，斩敌当先！",
}

local yajiao = fk.CreateSkill{
  name = "yajiao",
}

local spec = {
  anim_type = "support",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(yajiao.name) and player.room.current ~= player
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local cards = room:getNCards(1)
    room:turnOverCardsFromDrawPile(player, cards, yajiao.name)
    local to = room:askToChoosePlayers(player, {
      targets = room.alive_players,
      max_num = 1,
      min_num = 1,
      prompt = "#yajiao-card:::"..Fk:getCardById(cards[1]):toLogString(),
      skill_name = yajiao.name,
      cancelable = false,
    })[1]
      room:obtainCard(to, cards, true, fk.ReasonGive, player, yajiao.name)
    if data.card.type ~= Fk:getCardById(cards[1]).type and not player.dead then
      room:askToDiscard(player, {
        min_num = 1,
        max_num = 1,
        include_equip = true,
        skill_name = yajiao.name,
        cancelable = false,
      })
    end
  end,
}

yajiao:addEffect(fk.CardUsing, spec)
yajiao:addEffect(fk.CardResponding, spec)

return yajiao
