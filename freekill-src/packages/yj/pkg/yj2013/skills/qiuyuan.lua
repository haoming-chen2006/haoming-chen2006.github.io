local qiuyuan = fk.CreateSkill {
  name = "qiuyuan",
}

Fk:loadTranslationTable{
  ["qiuyuan"] = "求援",
  [":qiuyuan"] = "当你成为【杀】的目标时，你可以令另一名其他角色选择一项：交给你一张【闪】，或成为此【杀】的额外目标。",

  ["#qiuyuan-choose"] = "求援：令另一名其他角色交给你一张【闪】，否则其成为此【杀】额外目标",
  ["#qiuyuan-give"] = "求援：你需交给 %dest 一张【闪】，否则成为此【杀】额外目标",

  ["$qiuyuan1"] = "逆贼逞凶，卿可灭之。",
  ["$qiuyuan2"] = "求父亲救救大汉江山吧！"
}

qiuyuan:addEffect(fk.TargetConfirming, {
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(qiuyuan.name) and data.card.trueName == "slash" and not data.cancelled and
    table.find(player.room:getOtherPlayers(player, false), function(p)
      return p ~= data.from
    end)
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local targets = table.filter(room:getOtherPlayers(player, false), function(p)
      return p ~= data.from
    end)
    local to = room:askToChoosePlayers(player, {
      skill_name = qiuyuan.name,
      min_num = 1,
      max_num = 1,
      targets = targets,
      prompt = "#qiuyuan-choose",
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
    local card = room:askToCards(to, {
      skill_name = qiuyuan.name,
      min_num = 1,
      max_num = 1,
      pattern = "jink",
      prompt = "#qiuyuan-give::" .. player.id,
      cancelable = true,
    })
    if #card > 0 then
      room:obtainCard(player, card, true, fk.ReasonGive, to, qiuyuan.name)
    else
      data:addTarget(to, nil, true)
    end
  end,
})

return qiuyuan
