local liancai = fk.CreateSkill {
  name = "tw__liancai",
}

Fk:loadTranslationTable{
  ["tw__liancai"] = "敛财",
  [":tw__liancai"] = "結束階段，你可以翻面並獲得一名角色裝備區內的一張牌。每當你翻面後，你可以將手牌摸至體力值。",

  ["#tw__liancai-choose"] = "敛财：你可以翻面并获得一名角色装备区内一张牌",
  ["#tw__liancai-invoke"] = "敛财：你可以摸牌至体力值",
}

liancai:addEffect(fk.EventPhaseStart, {
  anim_type = "control",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(liancai.name) and player.phase == Player.Finish and
      table.find(player.room.alive_players, function(p)
        return #p:getCardIds("e") > 0
      end)
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local targets = table.filter(room.alive_players, function(p)
      return #p:getCardIds("e") > 0
    end)
    local to = room:askToChoosePlayers(player, {
      min_num = 1,
      max_num = 1,
      targets = targets,
      prompt = "#tw__liancai-choose",
      skill_name = liancai.name,
      cancelable = true,
    })
    if #to > 0 then
      event:setCostData(self, {tos = to})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    player:turnOver()
    local to = event:getCostData(self).tos[1]
    if not player.dead and not to.dead and #to:getCardIds("e") > 0 then
      local id = room:askToChooseCard(player, {
        target = to,
        flag = "e",
        skill_name = liancai.name,
      })
      room:obtainCard(player, id, true, fk.ReasonPrey, player, liancai.name)
    end
  end,
})

liancai:addEffect(fk.TurnedOver, {
  anim_type = "drawcard",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(liancai.name) and player:getHandcardNum() < player.hp
  end,
  on_cost = function(self, event, target, player, data)
    return player.room:askToSkillInvoke(player, {
      skill_name = liancai.name,
      prompt = "#tw__liancai-invoke",
    })
  end,
  on_use = function(self, event, target, player, data)
    player:drawCards(player.hp - player:getHandcardNum(), liancai.name)
  end,
})

return liancai
