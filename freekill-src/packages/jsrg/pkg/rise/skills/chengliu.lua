local chengliu = fk.CreateSkill {
  name = "chengliu",
}

Fk:loadTranslationTable{
  ["chengliu"] = "乘流",
  [":chengliu"] = "准备阶段，你可以对一名装备区内牌数小于你的角色造成1点伤害，本回合你以此法造成的伤害值+1，"..
  "然后你可以弃置装备区内的一张牌，对一名本回合未以此法选择过的角色重复此流程。",

  ["#chengliu-invoke"] = "乘流：对一名装备数小于你的角色造成1点伤害，然后你可以弃置一张装备重复此流程",
  ["#chengliu-discard"] = "乘流：是否弃置一张装备，继续造成%arg点伤害？",
}

chengliu:addEffect(fk.EventPhaseStart, {
  anim_type = "offensive",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(chengliu.name) and player.phase == Player.Start and
      table.find(player.room.alive_players, function (p)
        return #player:getCardIds("e") > #p:getCardIds("e")
      end)
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local targets = table.filter(room.alive_players, function (p)
      return #player:getCardIds("e") > #p:getCardIds("e")
    end)
    local to = room:askToChoosePlayers(player, {
      targets = targets,
      min_num = 1,
      max_num = 1,
      skill_name = chengliu.name,
      prompt = "#chengliu-invoke",
      cancelable = true,
    })
    if #to > 0 then
      event:setCostData(self, {tos = to})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local to = event:getCostData(self).tos[1]
    room:addTableMark(player, "chengliu-turn", to.id)
    room:damage({
      from = player,
      to = to,
      damage = 1,
      skillName = chengliu.name,
    })
    local cards = player:getCardIds("e")
    while not player.dead and #player:getCardIds("e") > 0 do
      local targets = table.filter(room.alive_players, function (p)
        return #player:getCardIds("e") > #p:getCardIds("e") and not table.contains(player:getTableMark("chengliu-turn"), p.id)
      end)
      if #targets == 0 then return end
      to, cards = room:askToChooseCardsAndPlayers(player, {
        min_card_num = 1,
        max_card_num = 1,
        min_num = 1,
        max_num = 1,
        targets = targets,
        pattern = ".|.|.|equip",
        skill_name = chengliu.name,
        prompt = "#chengliu-discard:::"..(1 + #player:getTableMark("chengliu-turn")),
        cancelable = true,
        will_throw = true,
      })
      if #cards > 0 then
        to = to[1]
        room:addTableMark(player, "chengliu-turn", to.id)
        room:throwCard(cards, chengliu.name, player, player)
        if not to.dead then
          room:damage({
            from = player,
            to = to,
            damage = #player:getTableMark("chengliu-turn"),
            skillName = chengliu.name,
          })
        end
      else
        return
      end
    end
  end,
})

return chengliu
