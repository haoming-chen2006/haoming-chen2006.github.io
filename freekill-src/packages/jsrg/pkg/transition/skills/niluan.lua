local niluan = fk.CreateSkill {
  name = "js__niluan",
}

Fk:loadTranslationTable{
  ["js__niluan"] = "逆乱",
  [":js__niluan"] = "准备阶段，你可以依次执行一至两项：1.弃置一张牌，对一名未对你造成过伤害的角色造成1点伤害；"..
  "2.令一名对你造成过伤害的角色摸两张牌。",

  ["#js__niluan-damage"] = "逆乱：你可以弃一张牌，对一名未对你造成过伤害的角色造成1点伤害",
  ["#js__niluan-draw"] = "逆乱：你可以令一名对你造成过伤害的角色摸两张牌",
}

niluan:addEffect(fk.EventPhaseStart, {
  anim_type = "offensive",
  can_trigger = function(self, event, target, player, data)
    if target == player and player:hasSkill(niluan.name) and player.phase == Player.Start then
      if table.find(player.room.alive_players, function (p)
        return table.contains(player:getTableMark(niluan.name), p.id)
      end) then
        return true
      else
        return not player:isNude()
      end
    end
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local targets1, targets2 = {}, {}
    for _, p in ipairs(room.alive_players) do
      if table.contains(player:getTableMark(niluan.name), p.id) then
        table.insert(targets2, p)
      else
        table.insert(targets1, p)
      end
    end
    if #targets1 > 0 and not player:isNude() then
      local to, card = room:askToChooseCardsAndPlayers(player, {
        min_card_num = 1,
        max_card_num = 1,
        min_num = 1,
        max_num = 1,
        targets = targets1,
        skill_name = niluan.name,
        prompt = "#js__niluan-damage",
        cancelable = true,
        will_throw = true,
      })
      if #to > 0 and #card > 0 then
        event:setCostData(self, {tos = to, cards = card, choice = "damage"})
        return true
      end
    end
    if #targets2 > 0 then
      local to = room:askToChoosePlayers(player, {
        min_num = 1,
        max_num = 1,
        targets = targets2,
        skill_name = niluan.name,
        prompt = "#js__niluan-draw",
        cancelable = true,
      })
      if #to > 0 then
        event:setCostData(self, {tos = to, choice = "draw"})
        return true
      end
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local to = event:getCostData(self).tos[1]
    local choice = event:getCostData(self).choice
    if choice == "damage" then
      room:throwCard(event:getCostData(self).cards, niluan.name, player, player)
      if not to.dead then
        room:damage{
          from = player,
          to = to,
          damage = 1,
          skillName = niluan.name,
        }
      end
      if player.dead then return end
      local targets = table.filter(room.alive_players, function (p)
        return table.contains(player:getTableMark(niluan.name), p.id)
      end)
      if #targets > 0 then
        to = room:askToChoosePlayers(player, {
          min_num = 1,
          max_num = 1,
          targets = targets,
          skill_name = niluan.name,
          prompt = "#js__niluan-draw",
          cancelable = true,
        })
        if #to == 0 then return end
        to = to[1]
      else
        return
      end
    end
    to:drawCards(2, niluan.name)
  end,

})

niluan:addEffect(fk.Damaged, {
  can_refresh = function(self, event, target, player, data)
    return target == player and player:hasSkill(niluan.name, true) and data.from
  end,
  on_refresh = function(self, event, target, player, data)
    player.room:addTableMarkIfNeed(player, niluan.name, data.from.id)
  end,
})

niluan:addAcquireEffect(function (self, player, is_start)
  if not is_start then
    local room = player.room
    local mark = {}
    room.logic:getActualDamageEvents(1, function (e)
      local damage = e.data
      if damage.to == player and damage.from then
        table.insertIfNeed(mark, damage.from.id)
      end
    end, Player.HistoryGame)
    if #mark > 0 then
      room:setPlayerMark(player, niluan.name, mark)
    end
  end
end)

return niluan
