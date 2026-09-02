local shichou = fk.CreateSkill {
  name = "shichoul",
  tags = { Skill.Lord, Skill.Limited },
}

Fk:loadTranslationTable{
  ["shichoul"] = "誓仇",
  [":shichoul"] = "主公技，限定技，回合开始时，你可指定一名蜀国角色并交给其两张牌。本盘游戏中，每当你受到伤害时，改为该角色代替你受到等量的伤害，"..
  "然后摸等量的牌，直到该角色第一次进入濒死状态。",

  ["#shichoul-invoke"] = "誓仇：你可以将两张牌交给一名蜀势力角色，你受到的伤害均转移给其直到其进入濒死状态",
  ["@@shichoul"] = "誓仇",
}

shichou:addEffect(fk.TurnStart, {
  anim_type = "control",
  can_trigger = function(self, event, target, player, data)
  return target == player and player:hasSkill(shichou.name) and
    player:usedSkillTimes(shichou.name, Player.HistoryGame) == 0 and
    #player:getCardIds("he") > 1 and
    table.find(player.room:getOtherPlayers(player, false), function(p)
      return p.kingdom == "shu"
    end)
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local targets = table.filter(room:getOtherPlayers(player, false), function(p)
      return p.kingdom == "shu"
    end)
    local to, cards = room:askToChooseCardsAndPlayers(player, {
      skill_name = shichou.name,
      min_card_num = 2,
      max_card_num = 2,
      targets = targets,
      min_num = 1,
      max_num = 1,
      prompt = "#shichoul-invoke",
    })
    if #to == 1 and #cards == 2 then
      event:setCostData(self, {tos = to, cards = cards})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local to = event:getCostData(self).tos[1]
    local cards = event:getCostData(self).cards
    room:setPlayerMark(player, "shichoul", to.id)
    room:addTableMarkIfNeed(to, "@@shichoul", player.id)
    room:obtainCard(to, cards, false, fk.ReasonGive, player, shichou.name)
  end,
})

shichou:addEffect(fk.DetermineDamageInflicted, {
  anim_type = "defensive",
  is_delay_effect = true,
  can_trigger = function(self, event, target, player, data)
  return target == player and player:getMark("shichoul") ~= 0 and
      not player.room:getPlayerById(player:getMark("shichoul")).dead
  end,
  on_cost = function (self, event, target, player, data)
    event:setCostData(self, {tos = {player:getMark("shichoul")}})
    return true
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local to = room:getPlayerById(player:getMark("shichoul"))
    local n = data.damage
    data:preventDamage()
    room:damage{
      from = data.from,
      to = to,
      damage = n,
      damageType = data.damageType,
      skillName = data.skillName,
      chain = data.chain,
      card = data.card,
    }
    if not to.dead then
      to:drawCards(n, shichou.name)
    end
  end,
})

shichou:addEffect(fk.EnterDying, {
  can_refresh = function(self, event, target, player, data) 
    return player:getMark("shichoul") ~= 0 and table.contains(target:getTableMark("@@shichoul"), player.id)
  end,
  on_refresh = function(self, event, target, player, data)
    local room = player.room
    room:removeTableMark(target, "@@shichoul", player.id)
    room:setPlayerMark(player, "shichoul", 0)
  end,
})

shichou:addEffect(fk.Death, {
  can_refresh = function(self, event, target, player, data)
    return target == player and (player:getMark("shichoul") ~= 0 or player:getMark("@@shichoul") ~= 0)
  end,
  on_refresh = function(self, event, target, player, data)
    local room = player.room
    if player:getMark("shichoul") ~= 0 then
      local to = room:getPlayerById(player:getMark("shichoul"))
      room:removeTableMark(to, "@@shichoul", player.id)
    end
    if player:getMark("@@shichoul") ~= 0 then
      for _, id in ipairs(player:getMark("@@shichoul")) do
        local p = room:getPlayerById(id)
        if p:getMark("shichoul") == player.id then
          room:setPlayerMark(p, "shichoul", 0)
        end
      end
    end
  end,
})

return shichou
