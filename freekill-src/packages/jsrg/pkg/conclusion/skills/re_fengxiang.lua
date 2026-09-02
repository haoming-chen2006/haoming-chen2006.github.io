local fengxiang = fk.CreateSkill {
  name = "re__fengxiang",
  tags = { Skill.Compulsory },
}

Fk:loadTranslationTable{
  ["re__fengxiang"] = "封乡",
  [":re__fengxiang"] = "锁定技，当你每回合首次造成或受到伤害后，你须与一名其他角色交换装备区内的所有牌，若你装备区内的牌数因此而减少，"..
  "你摸等同于减少数的牌。",

  ["#re__fengxiang-choose"] = "封乡：与一名角色交换装备区所有牌，若你的装备减少则摸牌",

  ["$re__fengxiang1"] = "堂堂天家贵胄，焉能屈膝侍于窃汉之贼。",
  ["$re__fengxiang2"] = "吾乃大汉昭烈帝之子，非贼魏之乡侯。",
}

local spec = {
  on_use = function(self, event, target, player, data)
    local room = player.room
    local to = room:askToChoosePlayers(player, {
      targets = room:getOtherPlayers(player, false),
      min_num = 1,
      max_num = 1,
      prompt = "#re__fengxiang-choose",
      skill_name = fengxiang.name,
      cancelable = false,
    })[1]
    local n = #player:getCardIds("e")
    room:swapAllCards(player, {player, to}, fengxiang.name, "e")
    n = n - #player:getCardIds("e")
    if not player.dead and n > 0 then
      player:drawCards(n, fengxiang.name)
    end
  end,
}

fengxiang:addEffect(fk.Damage, {
  anim_type = "control",
  can_trigger = function(self, event, target, player, data)
    if target == player and player:hasSkill(fengxiang.name) and
      #player.room:getOtherPlayers(player, false) > 0 and
      table.find(player.room.alive_players, function(p)
        return #p:getCardIds("e") > 0
      end) then
      local damage_events = player.room.logic:getActualDamageEvents(1, function (e)
        return e.data.from == player
      end, Player.HistoryTurn)
      return #damage_events > 0 and damage_events[1].data == data
    end
  end,
  on_use = spec.on_use,
})

fengxiang:addEffect(fk.Damaged, {
  anim_type = "masochism",
  can_trigger = function(self, event, target, player, data)
    if target == player and player:hasSkill(fengxiang.name) and
      #player.room:getOtherPlayers(player, false) > 0 and
      table.find(player.room.alive_players, function(p)
        return #p:getCardIds("e") > 0
      end) then
      local damage_events = player.room.logic:getActualDamageEvents(1, function (e)
        return e.data.to == player
      end, Player.HistoryTurn)
      return #damage_events > 0 and damage_events[1].data == data
    end
  end,
  on_use = spec.on_use,
})

return fengxiang
