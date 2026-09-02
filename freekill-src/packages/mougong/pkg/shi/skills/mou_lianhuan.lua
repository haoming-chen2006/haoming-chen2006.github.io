local mouLianhuan = fk.CreateSkill({
  name = "mou__lianhuan",
})

Fk:loadTranslationTable{
  ["mou__lianhuan"] = "连环",
  [":mou__lianhuan"] = "出牌阶段，你可以将一张♣手牌当【铁索连环】使用（每个出牌阶段限一次）或重铸；当你使用【铁索连环】时，你可以失去1点体力。"..
  "若如此做，当此牌指定一名角色为目标后，若其未横置，你随机弃置其一张手牌。",
  ["#mou__lianhuan"] = "连环：你可以将一张手牌当【铁索连环】使用（每个出牌阶段限一次）或重铸",
  ["#mou__lianhuan_ts"] = "连环",
  ["#mou__lianhuan-invoke"] = "连环：你可以失去1点体力，当此【铁索连环】指定未横置的角色为目标后，你随机弃置其一张手牌",

  ["$mou__lianhuan1"] = "任凭潮涌，连环无惧！",
  ["$mou__lianhuan2"] = "并排横江，可利水战！",
}

mouLianhuan:addEffect("active", {
  mute = true,
  card_num = 1,
  min_target_num = 0,
  prompt = "#mou__lianhuan",
  can_use = function(self, player)
    return not player:isKongcheng()
  end,
  card_filter = function(self, player, to_select, selected)
    return #selected == 0 and Fk:getCardById(to_select).suit == Card.Club and Fk:currentRoom():getCardArea(to_select) ~= Player.Equip
  end,
  target_filter = function(self, player, to_select, selected, selected_cards)
    if #selected_cards ~= 1 or player:getMark("mou__lianhuan_used-phase") > 0 then return false end
    local card = Fk:cloneCard("iron_chain")
    card:addSubcard(selected_cards[1])
    return card.skill:canUse(player, card) and card.skill:targetFilter(player, to_select, selected, selected_cards, card) and
    not player:prohibitUse(card) and not player:isProhibited(to_select, card)
  end,
  on_use = function(self, room, effect)
    ---@type string
    local skillName = mouLianhuan.name
    local player = effect.from
    player:broadcastSkillInvoke(skillName)
    if #effect.tos == 0 then
      room:notifySkillInvoked(player, skillName, "drawcard")
      room:recastCard(effect.cards, player, skillName)
    else
      room:notifySkillInvoked(player, skillName, "control")
      room:sortByAction(effect.tos)
      room:addPlayerMark(player, "mou__lianhuan_used-phase")
      room:useVirtualCard("iron_chain", effect.cards, player, effect.tos, skillName)
    end
  end,
})

mouLianhuan:addEffect("targetmod", {
  extra_target_func = function(self, player, skill, card)
    if card and card.name == "iron_chain" and player:hasSkill(mouLianhuan.name) and player:getMark("mou__lianhuan_levelup") > 0 then
      return 999
    end
  end,
})

mouLianhuan:addEffect(fk.CardUsing, {
  anim_type = "control",
  can_trigger = function(self, event, target, player, data)
    return
      player:hasSkill(mouLianhuan.name) and
      target == player and
      data.card.name == "iron_chain" and
      player:getMark("mou__lianhuan_levelup") == 0 and
      player.hp > 0
  end,
  on_cost = function(self, event, target, player, data)
    return player.room:askToSkillInvoke(player, { skill_name = mouLianhuan.name, prompt = "#mou__lianhuan-invoke" })
  end,
  on_use = function(self, event, target, player, data)
    data.extra_data = data.extra_data or {}
    data.extra_data.mou__lianhuan_used = true
    player.room:loseHp(player, 1, self.name)
  end,
})

mouLianhuan:addEffect(fk.TargetSpecified, {
  anim_type = "control",
  can_trigger = function(self, event, target, player, data)
    local room = player.room
    local to = data.to
    if
      player:hasSkill(mouLianhuan.name) and
      target == player and
      data.card.name == "iron_chain" and
      not (to.dead or to.chained or to:isKongcheng())
    then
      local use_data = room.logic:getCurrentEvent()
      return
        player:getMark("mou__lianhuan_levelup") > 0 or
        (use_data and use_data.data.extra_data and use_data.data.extra_data.mou__lianhuan_used)
    end
  end,
  on_cost = Util.TrueFunc,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local to = data.to
    if to:isKongcheng() then return false end
    room:throwCard(room:tableRandomPick(to:getCardIds("h")), mouLianhuan.name, to, player)
  end,
})

return mouLianhuan
