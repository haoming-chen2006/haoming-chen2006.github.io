local kuxin = fk.CreateSkill {
  name = "kuxin",
}

Fk:loadTranslationTable{
  ["kuxin"] = "枯心",
  [":kuxin"] = "当你受到伤害后，你可以令所有其他角色依次展示任意张手牌，你选择一项：1.获得所有角色展示的牌；2.获得并展示一名其他角色未展示的手牌。"..
  "若你没有因此获得<font color='red'>♥</font>牌，你弃置获得的牌并翻面。",

  ["#kuxin-ask"] = "枯心：请展示任意张手牌，%src 可能获得展示牌或未展示牌",
  ["#kuxin-choose"] = "枯心：获得一名角色未展示的手牌，或点“取消”获得所有角色展示的手牌",
}

kuxin:addEffect(fk.Damaged, {
  anim_type = "masochism",
  can_trigger = function (self, event, target, player, data)
    return target == player and player:hasSkill(kuxin.name) and
      table.find(player.room:getOtherPlayers(player, false), function (p)
        return not p:isKongcheng()
      end)
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    if room:askToSkillInvoke(player, {
      skill_name = kuxin.name,
    }) then
      event:setCostData(self, {tos = room:getOtherPlayers(player, false)})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local mapper = {}
    for _, p in ipairs(room:getOtherPlayers(player)) do
      if not p.dead and not p:isKongcheng() then
        local cards = room:askToCards(p, {
          min_num = 1,
          max_num = 999,
          include_equip = false,
          skill_name = kuxin.name,
          prompt = "#kuxin-ask:"..player.id,
          cancelable = true,
        })
        if #cards > 0 then
          mapper[p] = cards
          p:showCards(cards)
        end
      end
    end
    if player.dead then return end
    local targets = table.filter(room:getOtherPlayers(player, false), function (p)
      return not p:isKongcheng()
    end)
    local to = room:askToChoosePlayers(player, {
      min_num = 1,
      max_num = 1,
      targets = targets,
      skill_name = kuxin.name,
      prompt = "#kuxin-choose",
      cancelable = true,
    })
    local cards = {}
    if #to > 0 then
      to = to[1]
      mapper[to] = mapper[to] or {}
      cards = table.filter(to:getCardIds("h"), function (id)
        return not table.contains(mapper[to], id)
      end)
    else
      for p, ids in pairs(mapper) do
        ids = table.filter(p:getCardIds("h"), function (id)
          return table.contains(mapper[p], id)
        end)
        table.insertTableIfNeed(cards, ids)
      end
    end
    if #cards == 0 then
      player:turnOver()
      return
    end
    local yes = table.find(cards, function (id)
      return Fk:getCardById(id).suit == Card.Heart
    end)
    room:moveCardTo(cards, Card.PlayerHand, player, fk.ReasonPrey, kuxin.name, nil, true, player)
    if player.dead then return end
    if to then
      cards = table.filter(cards, function (id)
        return table.contains(player:getCardIds("h"), id)
      end)
      if #cards > 0 then
        player:showCards(cards)
      end
      if player.dead then return end
    end
    if not yes then
      cards = table.filter(cards, function (id)
        return table.contains(player:getCardIds("h"), id) and not player:prohibitDiscard(id)
      end)
      if #cards > 0 then
        room:throwCard(cards, kuxin.name, player, player)
      end
      if not player.dead then
        player:turnOver()
      end
    end
  end,
})

return kuxin
