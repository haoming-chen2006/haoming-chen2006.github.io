local tuxi = fk.CreateSkill({
  name = "mou__tuxi",
  dynamic_desc = function(self, player)
    local room = Fk:currentRoom()
    if room:isGameMode("1v2_mode") or room:isGameMode("2v2_mode") then
      return "mou__tuxi_not_role"
    else
      return "mou__tuxi_role_mode"
    end
  end,
})

Fk:loadTranslationTable{
  ["mou__tuxi"] = "突袭",
  [":mou__tuxi"] = "你的回合内限两次（若为斗地主或2v2模式则改为一次），当你不因此技能获得牌后，你可以将其中任意张牌置入弃牌堆，" ..
  "然后你获得至多X名其他角色各一张手牌（X为你此次以此法置入弃牌堆的牌数）。",

  [":mou__tuxi_not_role"] = "你的回合内限一次，当你不因此技能获得牌后，你可以将其中任意张牌置入弃牌堆，" ..
  "然后你获得至多X名其他角色各一张手牌（X为你此次以此法置入弃牌堆的牌数）。",
  [":mou__tuxi_role_mode"] = "你的回合内限两次，当你不因此技能获得牌后，你可以将其中任意张牌置入弃牌堆，" ..
  "然后你获得至多X名其他角色各一张手牌（X为你此次以此法置入弃牌堆的牌数）。",
  ["#mou__tuxi"] = "突袭：你可以将获得的牌置入弃牌堆，获得至多等量其他角色各一张牌",

  ["$mou__tuxi1"] = "成败之机，在此一战，诸君何疑！",
  ["$mou__tuxi2"] = "及敌未合，折其盛势，以安众心！",
}

tuxi:addAuxActiveSkill("#mou__tuxi_active", {
  min_card_num = 1,
  min_target_num = 1,
  card_filter = function(self, player, to_select, selected)
    return table.contains(self.optional_cards or {}, to_select)
  end,
  target_filter = function(self, player, to_select, selected, selected_cards)
    return #selected < #selected_cards and player ~= to_select and not to_select:isKongcheng()
  end,
})

tuxi:addEffect(fk.AfterCardsMove, {
  anim_type = "control",
  times = function (self, player)
    local room = Fk:currentRoom()
    local uselimitation = 2
    if room:isGameMode("1v2_mode") or room:isGameMode("2v2_mode") then
      uselimitation = 1
    end
    return uselimitation - player:usedSkillTimes(tuxi.name, Player.HistoryTurn)
  end,
  can_trigger = function(self, event, target, player, data)
    ---@type string
    local skillName = tuxi.name
    local room = player.room
    local uselimitation = (room:isGameMode("1v2_mode") or room:isGameMode("2v2_mode")) and 1 or 2
    if
      player:hasSkill(skillName) and
      player:usedSkillTimes(skillName, Player.HistoryTurn) < uselimitation and
      player.phase ~= Player.NotActive
    then
      local ids = {}
      for _, move in ipairs(data) do
        if move.to == player and move.toArea == Card.PlayerHand and move.skillName ~= skillName then
          for _, info in ipairs(move.moveInfo) do
            if table.contains(player:getCardIds("h"), info.cardId) then
              table.insertIfNeed(ids, info.cardId)
            end
          end
        end
      end
      ids = room.logic:moveCardsHoldingAreaCheck(ids)
      if #ids > 0 then
        event:setCostData(self, ids)
        return true
      end
    end
  end,
  on_cost = function (self, event, target, player, data)
    local _, ret = player.room:askToUseActiveSkill(
      player,
      {
        skill_name = "#mou__tuxi_active",
        prompt = "#mou__tuxi",
        extra_data = { optional_cards = event:getCostData(self) }
      }
    )
    if ret then
      player.room:sortByAction(ret.targets)
      event:setCostData(self, { cards = ret.cards, tos = ret.targets })
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    ---@type string
    local skillName = tuxi.name
    local room = player.room
    local costData = event:getCostData(self)
    local tos = costData.tos
    room:moveCardTo(costData.cards, Card.DiscardPile, nil, fk.ReasonPutIntoDiscardPile, skillName, nil, true, player)
    for _, to in ipairs(tos) do
      if player.dead then break end
      if not to:isKongcheng() then
        local cid = room:askToChooseCard(player, {
          target = to,
          flag = "h",
          skill_name = skillName,
        })
        room:obtainCard(player, cid, false, fk.ReasonPrey, player, skillName)
      end
    end
  end,
})

return tuxi
