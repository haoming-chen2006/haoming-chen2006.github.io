local shushen = fk.CreateSkill {
  name = "sp__shushen",
}

Fk:loadTranslationTable{
  ["sp__shushen"] = "淑慎",
  [":sp__shushen"] = "当你回复1点体力时，你可以令一名其他角色回复1点体力或摸两张牌。",

  ["#sp__shushen-choose"] = "淑慎：你可以令一名角色回复1点体力或摸两张牌",

  ["$sp__shushen1"] = "妾身无恙，相公请安心征战。",
  ["$sp__shushen2"] = "船到桥头自然直。",
}

shushen:addEffect(fk.HpRecover, {
  anim_type = "support",
  trigger_times = function (self, event, target, player, data)
    return data.num
  end,
  can_trigger = function (self, event, target, player, data)
    return target == player and player:hasSkill(shushen.name) and
      #player.room:getOtherPlayers(player, false) > 0
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local to = room:askToChoosePlayers(player, {
      targets = room:getOtherPlayers(player, false),
      min_num = 1,
      max_num = 1,
      prompt = "#sp__shushen-choose",
      skill_name = shushen.name,
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
    local choices = {"draw2"}
    if to:isWounded() then
      table.insert(choices, "recover")
    end
    local choice = room:askToChoice(to, {
      choices = choices,
      skill_name = shushen.name
    })
    if choice == "draw2" then
      to:drawCards(2, shushen.name)
    else
      room:recover{
        who = to,
        num = 1,
        recoverBy = player,
        skillName = shushen.name,
      }
    end
  end,
})

return shushen
