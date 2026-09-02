local qiaobian = fk.CreateSkill({
  name = "mou__qiaobian",
})

Fk:loadTranslationTable {
  ["mou__qiaobian"] = "巧变",
  [":mou__qiaobian"] = "准备阶段，你可以弃置任意张不同区域内的牌，然后跳过等量个阶段，并于跳过对应阶段后可以执行相应效果：<br>" ..
      "1.摸牌阶段，你可以获得至多两名其他角色各一张手牌；<br>" ..
      "2.出牌阶段，你可以移动场上一张牌，然后若你装备区内的牌数未增加，则你可以令因此场上牌数增加的角色摸两张牌；<br>" ..
      "3.弃牌阶段，你摸一张牌，然后在结束阶段后，若你手牌数不小于场上角色数，你执行一个额外的出牌阶段。",

  ["#mou__qiaobian-invoke"] = "巧变：你可以弃置任意区域各一张牌，跳过等量个阶段并执行后续效果",
  ["#mou__qiaobian-skip"] = "巧变：请选择跳过的%arg个阶段",
  ["#mou__qiaobian-prey"] = "巧变：你可以获得至多两名其他角色各一张手牌",
  ["#mou__qiaobian-move"] = "巧变：你可以移动场上一张牌",
  ["#mou__qiaobian-draw"] = "巧变：是否令 %dest 摸两张牌？",
  ["@@mou__qiaobian-inhand"] = "巧变",

  ["$mou__qiaobian1"] = "因势而变，则可引势而为。",
  ["$mou__qiaobian2"] = "将计就计，变夺胜机。",
}

qiaobian:addAuxActiveSkill("#mou__qiaobian_active", {
  min_card_num = 1,
  max_card_num = 3,
  target_num = 0,
  expand_pile = function (self, player)
    return player:getCardIds("j")
  end,
  card_filter = function (self, player, to_select, selected)
    return not player:prohibitDiscard(to_select) and
      not table.find(selected, function (id)
        return Fk:currentRoom():getCardArea(id) == Fk:currentRoom():getCardArea(to_select)
      end)
  end,
})

qiaobian:addEffect(fk.EventPhaseStart, {
  anim_type = "control",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(qiaobian.name) and player.phase == Player.Start and
        not player:isAllNude()
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local success, dat = room:askToUseActiveSkill(player, {
      skill_name = "#mou__qiaobian_active",
      prompt = "#mou__qiaobian-invoke",
    })
    if success and dat then
      event:setCostData(self, { cards = dat.cards })
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local cards = event:getCostData(self).cards or {}
    room:throwCard(cards, qiaobian.name, player, player)
    if player.dead then return end
    local choices = room:askToChoices(player, {
      min_num = #cards,
      max_num = #cards,
      choices = { "phase_draw", "phase_play", "phase_discard" },
      skill_name = qiaobian.name,
      prompt = "#mou__qiaobian-skip:::" .. #cards,
      cancelable = false,
    })
    room:setPlayerMark(player, "mou__qiaobian-turn", choices)
    if table.contains(choices, "phase_draw") then
      player:skip(Player.Draw)
    end
    if table.contains(choices, "phase_play") then
      player:skip(Player.Play)
    end
    if table.contains(choices, "phase_discard") then
      player:skip(Player.Discard)
    end
  end,
})

qiaobian:addEffect(fk.EventPhaseSkipped, {
  anim_type = "control",
  is_delay_effect = true,
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(qiaobian.name) and
        table.contains(player:getTableMark("mou__qiaobian-turn"), Util.PhaseStrMapper(data.phase))
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    if data.phase == Player.Draw then
      local targets = table.filter(room:getOtherPlayers(player, false), function(p)
        return not p:isKongcheng()
      end)
      local tos = room:askToChoosePlayers(player, {
        min_num = 1,
        max_num = 2,
        targets = targets,
        skill_name = qiaobian.name,
        prompt = "#mou__qiaobian-prey",
        cancelable = true,
      })
      if #tos > 0 then
        room:sortByAction(tos)
        for _, p in ipairs(tos) do
          if player.dead then return end
          if not p:isKongcheng() then
            local id = room:askToChooseCard(player, {
              skill_name = qiaobian.name,
              target = p,
              flag = "h",
            })
            room:obtainCard(player, id, false, fk.ReasonPrey, player, qiaobian.name, "@@mou__qiaobian-inhand")
          end
        end
      end
    elseif data.phase == Player.Play then
      if #room:canMoveCardInBoard() > 0 then
        local targets = room:askToChooseToMoveCardInBoard(player, {
          prompt = "#mou__qiaobian-move",
          skill_name = qiaobian.name,
          cancelable = true,
        })
        if #targets == 2 then
          local result = room:askToMoveCardInBoard(player, {
            target_one = targets[1],
            target_two = targets[2],
            skill_name = qiaobian.name,
          })
          if result and (result.to ~= player or result.card.type ~= Card.TypeEquip) and not result.to.dead and
              room:askToSkillInvoke(player, {
                skill_name = qiaobian.name,
                prompt = "#mou__qiaobian-draw::" .. result.to.id,
              }) then
            result.to:drawCards(2, qiaobian.name, nil, "@@mou__qiaobian-inhand")
          elseif result and result.to == player and result.card.type == Card.TypeEquip and not result.to.dead then
            room:setCardMark(result.card, "@@mou__qiaobian-inhand", 1)
          end
        end
      end
    elseif data.phase == Player.Discard then
      room:setPlayerMark(player, "mou__qiaobian_discard-turn", 1)
      player:drawCards(1, qiaobian.name, nil, "@@mou__qiaobian-inhand")
    end
  end,
})

qiaobian:addEffect(fk.EventPhaseEnd, {
  mute = true,
  is_delay_effect = true,
  can_trigger = function(self, event, target, player, data)
    return target == player and player:getMark("mou__qiaobian_discard-turn") > 0 and player.phase == Player.Finish and
        player:getHandcardNum() >= #player.room.alive_players
  end,
  on_use = function(self, event, target, player, data)
    player.room:setPlayerMark(player, "mou__qiaobian_discard-turn", 0)
    player:gainAnExtraPhase(Player.Play, qiaobian.name, true)
  end,
})

return qiaobian
