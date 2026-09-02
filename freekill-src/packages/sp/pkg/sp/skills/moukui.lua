local moukui = fk.CreateSkill {
  name = "moukui",
}

Fk:loadTranslationTable {
  ["moukui"] = "谋溃",
  [":moukui"] = "当你使用【杀】指定一名角色为目标后，你可以选择一项：摸一张牌，或弃置其一张牌。若如此做，此【杀】被【闪】抵消时，"..
  "该角色弃置你的一张牌。",

  ["moukui_discard"] = "弃置%dest一张牌",
  ["#moukui-invoke"] = "谋溃：你可以发动“谋溃”，对 %dest 执行一项",

  ["$moukui1"] = "你的死期到了。",
  ["$moukui2"] = "同归于尽吧！",
}

moukui:addEffect(fk.TargetSpecified, {
  mute = true,
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(moukui.name) and data.card.trueName == "slash"
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local choices = { "draw1", "Cancel" }
    if not data.to:isNude() then
      table.insert(choices, 2, "moukui_discard::"..data.to.id)
    end
    local choice = room:askToChoice(player, {
      choices = choices,
      skill_name = moukui.name,
      prompt = "#moukui-invoke::"..data.to.id,
    })
    if choice ~= "Cancel" then
      event:setCostData(self, {tos = {data.to}, choice = choice})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    player:broadcastSkillInvoke(moukui.name, 1)
    room:notifySkillInvoked(player, moukui.name, "control")
    data.extra_data = data.extra_data or {}
    data.extra_data.moukui = data.extra_data.moukui or {}
    table.insertIfNeed(data.extra_data.moukui, data.to)
    if event:getCostData(self).choice == "draw1" then
      player:drawCards(1, moukui.name)
    else
      local id = room:askToChooseCard(player, {
        target = data.to,
        flag = "he",
        skill_name = moukui.name,
      })
      room:throwCard(id, moukui.name, data.to, player)
    end
  end,
})

moukui:addEffect(fk.CardEffectCancelledOut, {
  mute = true,
  is_delay_effect = true,
  can_trigger = function(self, event, target, player, data)
    if target == player and data.card.trueName == "slash" and not player.dead then
      local e = player.room.logic:getCurrentEvent():findParent(GameEvent.UseCard, true)
      if e then
        local use = e.data
        if use.extra_data and use.extra_data.moukui and table.contains(use.extra_data.moukui, data.to) and not data.to.dead then
          return true
        end
      end
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    player:broadcastSkillInvoke(moukui.name, 2)
    room:notifySkillInvoked(player, moukui.name, "negative")
    room:doIndicate(data.to, { player })
    if player:isNude() then return end
    local id = room:askToChooseCard(data.to, {
      target = player,
      flag = "he",
      skill_name = moukui.name,
    })
    room:throwCard(id, moukui.name, player, data.to)
  end,
})

return moukui
