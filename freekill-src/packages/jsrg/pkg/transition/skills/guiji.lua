local guiji = fk.CreateSkill {
  name = "guiji",
}

Fk:loadTranslationTable{
  ["guiji"] = "闺忌",
  [":guiji"] = "每回合限一次，出牌阶段，你可以与一名手牌数小于你的男性角色交换手牌，然后其下个出牌阶段结束时，你可以与其交换手牌。",

  ["#guiji"] = "闺忌：你可以与一名手牌数小于你的男性角色交换手牌",
  ["@@guiji"] = "闺忌",
  ["#guiji-invoke"] = "闺忌：是否与 %dest 交换手牌？",

  ["$guiji1"] = "孙家虎女，向来无所忌讳。",
  ["$guiji2"] = "厮杀半生，尚惧兵器邪？",
}

guiji:addEffect("active", {
  anim_type = "control",
  prompt = "#guiji",
  target_num = 1,
  can_use = function(self, player)
    return player:usedSkillTimes(guiji.name, Player.HistoryTurn) == 0 and not player:isKongcheng()
  end,
  card_filter = Util.FalseFunc,
  target_filter = function(self, player, to_select, selected, selected_cards)
    return #selected == 0 and to_select ~= player and to_select:isMale() and to_select:getHandcardNum() < player:getHandcardNum()
  end,
  on_use = function(self, room, effect)
    local player = effect.from
    local target = effect.tos[1]
    room:addTableMarkIfNeed(target, "@@guiji", player.id)
    room:swapAllCards(player, {player, target}, guiji.name)
  end,
})

guiji:addEffect(fk.EventPhaseEnd, {
  anim_type = "support",
  is_delay_effect = true,
  can_trigger = function(self, event, target, player, data)
    return target.phase == Player.Play and table.contains(target:getTableMark("@@guiji"), player.id) and
      not player.dead and not target.dead and not (player:isKongcheng() and target:isKongcheng())
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    if room:askToSkillInvoke(player, {
      skill_name = guiji.name,
      prompt = "#guiji-invoke::"..target.id,
    }) then
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    player.room:swapAllCards(player, {player, target}, guiji.name)
  end,

  late_refresh = true,
  can_refresh = function(self, event, target, player, data)
    return target == player and player.phase == Player.Play
  end,
  on_refresh = function(self, event, target, player, data)
    player.room:setPlayerMark(player, "@@guiji", 0)
  end,
})

return guiji
