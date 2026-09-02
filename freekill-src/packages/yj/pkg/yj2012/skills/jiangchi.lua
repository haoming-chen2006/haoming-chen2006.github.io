
local jiangchi = fk.CreateSkill {
  name = "jiangchi",
}

Fk:loadTranslationTable{
  ["jiangchi"] = "将驰",
  [":jiangchi"] = "摸牌阶段，你可以选择一项：1.额外摸一张牌，本回合不能使用或打出【杀】；2.少摸一张牌，本回合出牌阶段你使用【杀】无距离限制"..
  "且使用【杀】次数上限+1。",

  ["jiangchi_add"] = "多摸一张牌，本回合不能使用或打出【杀】",
  ["jiangchi_minus"] = "少摸一张牌，使用【杀】无距离限制且次数+1",

  ["$jiangchi1"] = "谨遵父训，不可逞匹夫之勇。",
  ["$jiangchi2"] = "吾定当身先士卒，振魏武雄风！",
}

jiangchi:addEffect(fk.DrawNCards, {
  mute = true,
  on_cost = function (self, event, target, player, data)
    local room = player.room
    local choices = { "jiangchi_add", "Cancel" }
    if data.n > 0 then
      table.insert(choices, 2, "jiangchi_minus")
    end
    local choice = room:askToChoice(player, {
      choices = choices,
      skill_name = jiangchi.name,
      all_choices = { "jiangchi_add", "jiangchi_minus", "Cancel" }
    })
    if choice ~= "Cancel" then
      event:setCostData(self, {choice = choice})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local choice = event:getCostData(self).choice
    if choice == "jiangchi_add" then
      data.n = data.n + 1
      player.room:notifySkillInvoked(player, jiangchi.name, "drawcard")
      player:broadcastSkillInvoke(jiangchi.name, 1)
    else
      player.room:notifySkillInvoked(player, jiangchi.name, "offensive")
      player:broadcastSkillInvoke(jiangchi.name, 2)
      data.n = data.n - 1
    end
    room:addPlayerMark(player, choice.."-turn", 1)
  end,
})

jiangchi:addEffect("targetmod", {
  residue_func = function(self, player, skill, scope)
    if player:getMark("jiangchi_minus-turn") > 0 and skill.trueName == "slash_skill" and scope == Player.HistoryPhase then
      return player:getMark("jiangchi_minus-turn")
    end
  end,
  bypass_distances = function(self, player, skill, card, to)
    return player:getMark("jiangchi_minus-turn") > 0 and skill.trueName == "slash_skill"
  end,
})
jiangchi:addEffect("prohibit", {
  prohibit_use = function(self, player, card)
    return player:getMark("jiangchi_add-turn") > 0 and card.trueName == "slash"
  end,
  prohibit_response = function(self, player, card)
    return player:getMark("jiangchi_add-turn") > 0 and card.trueName == "slash"
  end,
})

return jiangchi
