local qianxi = fk.CreateSkill {
  name = "re__qianxi",
}

Fk:loadTranslationTable{
  ["re__qianxi"] = "潜袭",
  [":re__qianxi"] = "准备阶段，你可以摸一张牌然后弃置一张牌。若如此做，你选择距离为1的一名角色，然后直到回合结束，该角色不能使用或打出"..
  "与你以此法弃置的牌颜色相同的手牌。",

  ["#re__qianxi-choose"] = "潜袭：令一名角色本回合不能使用或打出%arg手牌",
  ["@re__qianxi-turn"] = "潜袭",

  ["$re__qianxi1"] = "暗影深处，袭敌斩首！",
  ["$re__qianxi2"] = "擒贼先擒王，打蛇打七寸！",
}

qianxi:addEffect(fk.EventPhaseStart, {
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(qianxi.name) and player.phase == Player.Start
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    player:drawCards(1, qianxi.name)
    if player.dead then return end
    local card = room:askToDiscard(player, {
      min_num = 1,
      max_num = 1,
      include_equip = true,
      skill_name = qianxi.name,
      cancelable = false,
      skip = true,
    })
    if #card == 0 then return end
    local color = Fk:getCardById(card[1]):getColorString()
    room:throwCard(card, qianxi.name, player, player)
    if player.dead or color == "nocolor" then return end
    local targets = table.filter(room:getOtherPlayers(player, false), function (p)
      return player:distanceTo(p) == 1
    end)
    if #targets == 0 then return end
    local to = room:askToChoosePlayers(player, {
      targets = targets,
      min_num = 1,
      max_num = 1,
      prompt = "#re__qianxi-choose:::"..color,
      skill_name = qianxi.name,
      cancelable = false,
    })[1]
    room:addTableMarkIfNeed(to, "@re__qianxi-turn", color)
  end,
})

qianxi:addEffect("prohibit", {
  prohibit_use = function(self, player, card)
    if table.contains(player:getTableMark("@re__qianxi-turn"), card:getColorString()) then
      local subcards = card:isVirtual() and card.subcards or {card.id}
      return #subcards > 0 and
        table.every(subcards, function(id)
          return table.contains(player:getCardIds("h"), id)
        end)
    end
  end,
  prohibit_response = function(self, player, card)
    if table.contains(player:getTableMark("@re__qianxi-turn"), card:getColorString()) then
      local subcards = card:isVirtual() and card.subcards or {card.id}
      return #subcards > 0 and
        table.every(subcards, function(id)
          return table.contains(player:getCardIds("h"), id)
        end)
    end
  end,
})

return qianxi
