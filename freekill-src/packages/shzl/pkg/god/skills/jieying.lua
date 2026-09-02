local jieying = fk.CreateSkill {
  name = "jieying",
  tags = { Skill.Compulsory },
}

Fk:loadTranslationTable{
  ["jieying"] = "结营",
  [":jieying"] = "锁定技，你始终处于横置状态；处于连环状态的角色手牌上限+2；结束阶段，你横置一名其他角色。",

  ["#jieying-choose"] = "结营：选择一名其他角色，令其横置",

  ["$jieying1"] = "桃园结义，营一世之交。",
  ["$jieying2"] = "结草衔环，报兄弟大恩。",
}

jieying:addEffect(fk.GameStart, {
  anim_type = "negative",
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(jieying.name) and not player.chained
  end,
  on_use = function (self, event, target, player, data)
    player:setChainState(true)
  end,
})

jieying:addEffect(fk.EventAcquireSkill, {
  anim_type = "negative",
  can_trigger = function(self, event, target, player, data)
    return target == player and data.skill.name == jieying.name and not player.chained and not player.dead
  end,
  on_use = function (self, event, target, player, data)
    player:setChainState(true)
  end,
})

jieying:addEffect(fk.BeforeChainStateChange, {
  anim_type = "negative",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(jieying.name) and player.chained
  end,
  on_use = function (self, event, target, player, data)
    data.prevented = true
  end,
})

jieying:addEffect(fk.EventPhaseStart, {
  anim_type = "control",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(jieying.name) and player.phase == Player.Finish and
      table.find(player.room.alive_players, function(p)
        return p ~= player and not p.chained
      end)
  end,
  on_use = function (self, event, target, player, data)
    local room = player.room
    local targets = table.filter(room.alive_players, function(p)
      return p ~= player and not p.chained
    end)
    local to = room:askToChoosePlayers(player, {
      min_num = 1,
      max_num = 1,
      targets = targets,
      skill_name = jieying.name,
      prompt = "#jieying-choose",
      cancelable = false,
    })[1]
    to:setChainState(true)
  end,
})

jieying:addEffect("maxcards", {
  correct_func = function(self, player)
    if player.chained then
      local num = #table.filter(Fk:currentRoom().alive_players, function(p)
        return p:hasSkill(jieying.name)
      end)
      return 2 * num
    end
  end,
})

jieying:addAI(Fk.Ltk.AI.newChoosePlayersStrategy{
  think = function(self, ai)
    return ai:askToChoosePlayers({
      targets = ai:getEnabledTargets(),
      min_num = 1,
      max_num = 1,
      skill_name = jieying.name,
      benefit_func = function (logic, p)
        logic:setPlayerProperty(p, "chained", true)
      end,
    })
  end,
})

return jieying
