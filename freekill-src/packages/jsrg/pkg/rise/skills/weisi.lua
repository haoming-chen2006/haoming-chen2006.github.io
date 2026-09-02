local weisi = fk.CreateSkill {
  name = "weisi",
}

Fk:loadTranslationTable{
  ["weisi"] = "威肆",
  [":weisi"] = "出牌阶段限一次，你可以选择一名其他角色，令其将任意张手牌移出游戏直到回合结束，然后视为对其使用一张【决斗】，"..
  "此牌对其造成伤害后，你获得其所有手牌。",

  ["#weisi"] = "威肆：令一名角色将任意张手牌移出游戏直到回合结束，然后视为对其使用【决斗】！",
  ["#weisi-ask"] = "威肆：%src 将对你使用【决斗】！请将任意张手牌本回合移出游戏，【决斗】对你造成伤害后其获得你所有手牌！",
  ["$weisi"] = "威肆",

  ["$weisi1"] = "上者慑敌以威，灭敌以势。",
  ["$weisi2"] = "哼，求存者多，未见求死者也。",
  ["$weisi3"] = "未想逆贼区区，竟然好物甚巨。", --威肆（获得手牌）
}

weisi:addEffect("active", {
  mute = true,
  prompt = "#weisi",
  card_num = 0,
  target_num = 1,
  can_use = function(self, player)
    return player:usedSkillTimes(weisi.name, Player.HistoryPhase) == 0
  end,
  card_filter = Util.FalseFunc,
  target_filter = function(self, player, to_select, selected, selected_cards)
    return #selected == 0 and to_select ~= player
  end,
  on_use = function(self, room, effect)
    local player = effect.from
    local target = effect.tos[1]
    player:broadcastSkillInvoke(weisi.name, math.random(1, 2))
    room:notifySkillInvoked(player, weisi.name, "offensive")
    local cards = room:askToCards(target, {
      min_num = 1,
      max_num = 999,
      skill_name = weisi.name,
      prompt = "#weisi-ask:"..player.id,
      cancelable = true,
    })
    if #cards > 0 then
      target:addToPile("$weisi", cards, false, weisi.name, target.id)
    end
    if player.dead or target.dead then return end
    local card = Fk:cloneCard("duel")
    card.skillName = weisi.name
    if not player:isProhibited(target, card) then
      local use = {
        from = player,
        tos = {target},
        card = card,
        extra_data = {
          weisi_to = target,
        },
      }
      room:useCard(use)
    end
  end,
})

weisi:addEffect(fk.Damage, {
  mute = true,
  is_delay_effect = true,
  can_trigger = function(self, event, target, player, data)
    if target == player and not player.dead and
      data.card and table.contains(data.card.skillNames, weisi.name) and not data.to:isKongcheng() then
      local use_event = player.room.logic:getCurrentEvent():findParent(GameEvent.UseCard)
      if use_event then
        local use = use_event.data
        return use.extra_data and use.extra_data.weisi_to == data.to
      end
    end
  end,
  on_use = function(self, event, target, player, data)
    player:broadcastSkillInvoke(weisi.name, 3)
    player.room:moveCardTo(data.to:getCardIds("h"), Card.PlayerHand, player, fk.ReasonPrey, weisi.name, nil, false, player)
  end,
})

weisi:addEffect(fk.TurnEnd, {
  mute = true,
  is_delay_effect = true,
  can_trigger = function(self, event, target, player, data)
    return #player:getPile("$weisi") > 0
  end,
  on_use = function(self, event, target, player, data)
    player.room:moveCardTo(player:getPile("$weisi"), Card.PlayerHand, player, fk.ReasonJustMove, weisi.name, nil, false, player)
  end,
})

return weisi
