local fengxiang = fk.CreateSkill {
  name = "js__fengxiang",
  tags = { Skill.Compulsory },
}

Fk:loadTranslationTable{
  ["js__fengxiang"] = "封乡",
  [":js__fengxiang"] = "锁定技，当你受到伤害后，你须与一名其他角色交换装备区内的所有牌，若你装备区内的牌数因此而减少，你摸等同于减少数的牌。",

  ["#js__fengxiang-choose"] = "封乡：与一名角色交换装备区所有牌，若你的装备减少则摸牌",

  ["$js__fengxiang1"] = "百年扶汉积万骨，十载相隙累半生。",
  ["$js__fengxiang2"] = "一骑蓝翎魏旨到，王兄大梦可曾闻？",
}

fengxiang:addEffect(fk.Damaged, {
  anim_type = "masochism",
  can_trigger = function(self, event, target, player, data)
    return player == target and player:hasSkill(fengxiang.name) and
      #player.room:getOtherPlayers(player, false) > 0 and
      table.find(player.room.alive_players, function(p)
        return #p:getCardIds("e") > 0
      end)
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local to = room:askToChoosePlayers(player, {
      targets = room:getOtherPlayers(player, false),
      min_num = 1,
      max_num = 1,
      prompt = "#js__fengxiang-choose",
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
})

return fengxiang
