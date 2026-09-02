local qiuyuan = fk.CreateSkill {
  name = "nos__qiuyuan",
}

Fk:loadTranslationTable{
  ["nos__qiuyuan"] = "求援",
  [":nos__qiuyuan"] = "当你成为【杀】的目标时，你可以令一名有手牌的其他角色（使用者除外）交给你一张手牌。若此牌不为【闪】，该角色也成为"..
  "此【杀】的目标。",

  ["#nos__qiuyuan-choose"] = "求援：令另一名角色交给你一张手牌",
  ["#nos__qiuyuan-give"] = "求援：你需交给 %src 一张手牌，若不为【闪】则也成为此【杀】目标",

  ["$nos__qiuyuan1"] = "陛下，我该怎么办？",
  ["$nos__qiuyuan2"] = "曹贼暴虐，谁可诛之！"
}

qiuyuan:addEffect(fk.TargetConfirming, {
  anim_type = "control",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(qiuyuan.name) and data.card.trueName == "slash" and not data.cancelled and
      table.find(player.room:getOtherPlayers(player, false), function(p)
        return not p:isKongcheng() and p ~= data.from
      end)
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local targets = table.filter(room:getOtherPlayers(player, false), function(p)
      return not p:isKongcheng() and p ~= data.from
    end)
    local to = room:askToChoosePlayers(player, {
      skill_name = qiuyuan.name,
      min_num = 1,
      max_num = 1,
      targets = targets,
      prompt = "#nos__qiuyuan-choose",
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
      min_num = 1,
      max_num = 1,
      pattern = ".|.|.|hand",
      prompt = "#nos__qiuyuan-give:" .. player.id,
      skill_name = qiuyuan.name,
      cancelable = false
    })
    local yes = Fk:getCardById(card[1]).trueName == "jink"
    room:obtainCard(player, card, true, fk.ReasonGive, to, qiuyuan.name)
    if not yes then
      data:addTarget(to, nil, true)
    end
  end,
})

return qiuyuan
