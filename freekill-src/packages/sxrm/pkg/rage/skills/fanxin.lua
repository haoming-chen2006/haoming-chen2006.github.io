
local fanxin = fk.CreateSkill {
  name = "fanxin",
}

Fk:loadTranslationTable{
  ["fanxin"] = "燔心",
  [":fanxin"] = "游戏开始或“燔心”角色死亡后，你可以令一名其他角色获得〖狂暴〗〖无谋〗；其回合开始时，你可以移去其至多5枚“暴怒”并摸等量的牌。",

  ["#fanxin-choose"] = "燔心：你可以令一名角色获得“狂暴”、“无谋”！",
  ["#fanxin-invoke"] = "燔心：你可以移去 %dest 至多5枚“暴怒”并摸等量的牌",
}

local spec = {
  on_cost = function (self, event, target, player, data)
    local room = player.room
    local to = room:askToChoosePlayers(player, {
      targets = room:getOtherPlayers(player, false),
      min_num = 1,
      max_num = 1,
      prompt = "#fanxin-choose",
      skill_name = fanxin.name,
    })
    if #to > 0 then
      event:setCostData(self, { tos = to })
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local to = event:getCostData(self).tos[1]
    room:setPlayerMark(player, fanxin.name, to)
    room:handleAddLoseSkills(to, "kuangbao|wumou")
  end,
}

fanxin:addEffect(fk.GameStart, {
  anim_type = "control",
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(fanxin.name) and #player.room:getOtherPlayers(player, false) > 0
  end,
  on_cost = spec.on_cost,
  on_use = spec.on_use,
})

fanxin:addEffect(fk.Deathed, {
  anim_type = "control",
  can_trigger = function(self, event, target, player, data)
    return target == player:getMark(fanxin.name) and player:hasSkill(fanxin.name) and
      #player.room:getOtherPlayers(player, false) > 0
  end,
  on_cost = spec.on_cost,
  on_use = spec.on_use,
})

fanxin:addEffect(fk.TurnStart, {
  anim_type = "drawcard",
  can_trigger = function(self, event, target, player, data)
    return target == player:getMark(fanxin.name) and player:hasSkill(fanxin.name) and
      target:getMark("@baonu") > 0
  end,
  on_cost = function (self, event, target, player, data)
    local room = player.room
    local choices = {}
    for i = 1, math.min(target:getMark("@baonu"), 5) do
      table.insert(choices, tostring(i))
    end
    table.insert(choices, "Cancel")
    local choice = room:askToChoice(player, {
      choices = choices,
      skill_name = fanxin.name,
      prompt = "#fanxin-invoke::"..target.id,
    })
    if choice ~= "Cancel" then
      event:setCostData(self, { tos = { target }, choice = tonumber(choice) })
      return true
    end
  end,
  on_use = function (self, event, target, player, data)
    local room = player.room
    local n = event:getCostData(self).choice
    room:removePlayerMark(target, "@baonu", n)
    player:drawCards(n, fanxin.name)
  end,
})


return fanxin
