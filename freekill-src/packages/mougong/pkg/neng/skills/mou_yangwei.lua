local mouYangwei = fk.CreateSkill({
  name = "mou__yangwei",
})

Fk:loadTranslationTable{
  ["mou__yangwei"] = "扬威",
  [":mou__yangwei"] = "出牌阶段限一次，你可以摸两张牌且本阶段获得“威”标记，然后此技能失效直到下个回合的结束阶段。<br>"..
  "<em>“威”标记效果：使用【杀】的次数上限+1、使用【杀】无距离限制且无视防具牌。</em>",
  ["@@mou__yangwei-phase"] = "威",
  ["#mou__yangwei_trigger"] = "扬威",

  ["$mou__yangwei1"] = "哈哈哈哈！现在谁不知我华雄？",
  ["$mou__yangwei2"] = "定要关外诸侯，知我威名！",
}

mouYangwei:addEffect("active", {
  anim_type = "drawcard",
  target_num = 0,
  card_num = 0,
  card_filter = Util.FalseFunc,
  can_use = function(self, player)
    return player:usedSkillTimes(mouYangwei.name, Player.HistoryPhase) == 0 and player:getMark("mou__yangwei_used") == 0
  end,
  on_use = function(self, room, effect)
    ---@type string
    local skillName = mouYangwei.name
    local player = effect.from
    player:drawCards(2, skillName)
    room:setPlayerMark(player, "@@mou__yangwei-phase", 1)
    room:setPlayerMark(player, "mou__yangwei_used", 1)
    room:invalidateSkill(player, skillName)
  end,
})

mouYangwei:addEffect("targetmod", {
  residue_func = function(self, player, skill, scope)
    if player:getMark("@@mou__yangwei-phase") > 0 and skill.trueName == "slash_skill" and scope == Player.HistoryPhase then
      return 1
    end
  end,
  bypass_distances = function(self, player, skill)
    return player:getMark("@@mou__yangwei-phase") > 0 and skill.trueName == "slash_skill"
  end,
})

mouYangwei:addEffect(fk.TargetSpecified, {
  anim_type = "offensive",
  can_trigger = function(self, event, target, player, data)
    return
      target == player and
      player:getMark("@@mou__yangwei-phase") > 0 and
      data.card and
      data.card.trueName == "slash"
  end,
  on_cost = Util.TrueFunc,
  on_use = function(self, event, target, player, data)
    data.to:addQinggangTag(data)
  end,
})

mouYangwei:addEffect(fk.TurnStart, {
  can_refresh = function(self, event, target, player, data)
    return player == target and player:getMark("mou__yangwei_used") > 0
  end,
  on_refresh = function(self, event, target, player, data)
    player.room:setPlayerMark(player, "mou__yangwei_removed-turn", 1)
  end,
})

mouYangwei:addEffect(fk.EventPhaseStart, {
  can_refresh = function(self, event, target, player, data)
    return player == target and player.phase == Player.Finish and player:getMark("mou__yangwei_removed-turn") > 0
  end,
  on_refresh = function(self, event, target, player, data)
    local room = player.room
    room:setPlayerMark(player, "mou__yangwei_used", 0)
    room:validateSkill(player, "mou__yangwei")
  end,
})

return mouYangwei
