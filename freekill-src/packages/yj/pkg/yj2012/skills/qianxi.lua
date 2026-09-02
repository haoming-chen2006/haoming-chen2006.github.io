local qianxi = fk.CreateSkill {
  name = "qianxi",
}

Fk:loadTranslationTable{
  ["qianxi"] = "潜袭",
  [":qianxi"] = "准备阶段，你可以进行判定，然后令距离为1的一名角色本回合不能使用或打出与结果颜色相同的手牌。",

  ["#qianxi-choose"] = "潜袭：令一名角色本回合不能使用或打出%arg手牌",
  ["@qianxi-turn"] = "潜袭",

  ["$qianxi1"] = "喊什么喊？我敢杀你！",
  ["$qianxi2"] = "笑什么笑？叫你得意！"
}

qianxi:addEffect(fk.EventPhaseStart, {
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(qianxi.name) and player.phase == Player.Start
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local judge = {
      who = player,
      reason = qianxi.name,
      pattern = ".",
    }
    room:judge(judge)
    if player.dead or judge.card.color == Card.NoColor then return end
    local targets = table.filter(room.alive_players, function (p)
      return player:distanceTo(p) == 1
    end)
    if #targets == 0 then return end
    local to = room:askToChoosePlayers(player, {
      skill_name = qianxi.name,
      min_num = 1,
      max_num = 1,
      targets = targets,
      prompt = "#qianxi-choose:::"..judge.card:getColorString(),
      cancelable = false,
    })[1]
    room:addTableMarkIfNeed(to, "@qianxi-turn", judge.card:getColorString())
  end,
})

qianxi:addEffect("prohibit", {
  prohibit_use = function(self, player, card)
    return table.contains(player:getTableMark("@qianxi-turn"), card:getColorString())
  end,
  prohibit_response = function(self, player, card)
    return table.contains(player:getTableMark("@qianxi-turn"), card:getColorString())
  end,
})

qianxi:addAI(Fk.Ltk.AI.newInvokeStrategy{
  think = Util.TrueFunc,
})

return qianxi
