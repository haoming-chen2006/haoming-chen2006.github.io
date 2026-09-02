local qinrao = fk.CreateSkill {
  name = "qinrao",
}

Fk:loadTranslationTable{
  ["qinrao"] = "侵扰",
  [":qinrao"] = "其他角色出牌阶段开始时，你可以将一张牌当【决斗】对其使用，若其手牌中有可以打出的【杀】，其必须打出响应，否则其展示所有手牌。",

  ["#qinrao-use"] = "侵扰：你可以将一张牌当【决斗】对 %dest 使用",
}

qinrao:addEffect(fk.EventPhaseStart, {
  anim_type = "offensive",
  can_trigger = function(self, event, target, player, data)
    return target ~= player and player:hasSkill(qinrao.name) and target.phase == Player.Play and
      not player:isNude()
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local use = room:askToUseVirtualCard(player, {
      name = "duel",
      skill_name = qinrao.name,
      prompt = "#qinrao-use::" .. target.id,
      cancelable = true,
      extra_data = {
        exclusive_targets = {target.id},
      },
      card_filter = {
        n = 1,
      },
      skip = true,
    })
    if use then
      event:setCostData(self, {extra_data = use})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    player.room:useCard(event:getCostData(self).extra_data)
  end,
})

qinrao:addEffect(fk.PreCardEffect, {
  can_refresh = function(self, event, target, player, data)
    return data.from == player and data.card.trueName == "duel" and table.contains(data.card.skillNames, qinrao.name)
  end,
  on_refresh = function(self, event, target, player, data)
    data:changeCardSkill("qinrao__duel_skill")
  end,
})

return qinrao
