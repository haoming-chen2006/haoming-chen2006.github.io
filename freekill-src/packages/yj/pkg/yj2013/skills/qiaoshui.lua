local qiaoshui = fk.CreateSkill {
  name = "qiaoshui",
}

Fk:loadTranslationTable{
  ["qiaoshui"] = "巧说",
  [":qiaoshui"] = "出牌阶段开始时，你可以与一名其他角色拼点，若你赢，你使用的下一张基本牌或普通锦囊牌可以额外指定任意一名其他角色为目标或"..
  "减少指定一个目标；若你没赢，你不能使用锦囊牌直到回合结束。",

  ["#qiaoshui-invoke"] = "巧说：你可以拼点，若赢，下一张基本牌或锦囊牌可以增加/减少一个目标",
  ["@@qiaoshui-turn"] = "巧说",
  ["#qiaoshui-choose"] = "巧说：你可以为%arg增加或减少一个目标",

  ["$qiaoshui1"] = "合则两利，斗则两伤。",
  ["$qiaoshui2"] = "君且安坐，听我一言。",
}

qiaoshui:addEffect(fk.EventPhaseStart, {
  anim_type = "control",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(qiaoshui.name) and player.phase == Player.Play and
      table.find(player.room:getOtherPlayers(player, false), function(p)
        return player:canPindian(p)
      end)
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local targets = table.filter(room:getOtherPlayers(player, false), function(p)
      return player:canPindian(p)
    end)
    local to = room:askToChoosePlayers(player, {
      skill_name = qiaoshui.name,
      min_num = 1,
      max_num = 1,
      targets = targets,
      prompt = "#qiaoshui-invoke",
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
    local pindian = player:pindian({to}, qiaoshui.name)
    if player.dead then return end
    if pindian.results[to].winner == player then
      room:setPlayerMark(player, "@@qiaoshui-turn", 1)
    else
      room:setPlayerMark(player, "qiaoshui_lose-turn", 1)
    end
  end,
})

qiaoshui:addEffect(fk.AfterCardTargetDeclared, {
  anim_type = "control",
  is_delay_effect = true,
  can_trigger = function(self, event, target, player, data)
    return target == player and player:getMark("@@qiaoshui-turn") > 0 and
      (data.card.type == Card.TypeBasic or data.card:isCommonTrick())
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    room:setPlayerMark(player, "@@qiaoshui-turn", 0)
    local targets = data:getExtraTargets({bypass_distances = true})
    if #data.tos > 1 then
      table.insertTable(targets, data.tos)
    end
    if #targets == 0 then return false end
    local to = room:askToChoosePlayers(player, {
      skill_name = qiaoshui.name,
      min_num = 1,
      max_num = 1,
      targets = targets,
      prompt = "#qiaoshui-choose:::"..data.card:toLogString(),
      cancelable = true,
      extra_data = table.map(data.tos, Util.IdMapper),
      target_tip_name = "addandcanceltarget_tip",
    })
    if #to > 0 then
      to = to[1]
      if table.contains(data.tos, to) then
        data:removeTarget(to)
      else
        data:addTarget(to)
      end
    end
  end,
})

qiaoshui:addEffect("prohibit", {
  prohibit_use = function(self, player, card)
    return player:getMark("qiaoshui_lose-turn") > 0 and card.type == Card.TypeTrick
  end,
})

return qiaoshui
