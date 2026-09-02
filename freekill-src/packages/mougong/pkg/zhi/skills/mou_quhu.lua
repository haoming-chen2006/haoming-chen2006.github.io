local mouQuhu = fk.CreateSkill({
  name = "mou__quhu",
})

Fk:loadTranslationTable{
  ["mou__quhu"] = "驱虎",
  [":mou__quhu"] = "出牌阶段限一次，若你有牌，你可以与两名有牌的其他角色同时将至少一张牌扣置于各自的武将牌上。若你扣置的牌数唯一最少，" ..
  "则扣置牌较多的其他角色获得你扣置的牌，且双方获得各自扣置的牌；否则扣置牌较多的其他角色对扣置牌较少的其他角色造成1点伤害，并获得你扣置的牌，" ..
  "然后双方将其扣置的牌置入弃牌堆（若双方扣置牌数相等，则与你逆时针最近的角色视为扣置牌数较多）。",
  ["#mou__quhu"] = "驱虎：你可与两名角色扣置牌，若你扣置的不为最少，令他们互相伤害",
  ["#mou__quhu-user"] = "驱虎：请扣置至少一张牌，若不为最少，令他们互相伤害",
  ["#mou__quhu-target"] = "驱虎：请扣置至少一张牌，若你较多，有机会对 %dest 造成伤害",
  ["$mou__quhu"] = "驱虎",

  ["$mou__quhu1"] = "驱他山之虎，抗近身之豺。",
  ["$mou__quhu2"] = "引狼喰虎，待虎吞狼。",
}

mouQuhu:addEffect("active", {
  anim_type = "offensive",
  prompt = "#mou__quhu",
  card_num = 0,
  target_num = 2,
  can_use = function(self, player)
    return
      player:usedSkillTimes(mouQuhu.name, Player.HistoryPhase) == 0 and
      not player:isNude() and
      #Fk:currentRoom().alive_players > 2
  end,
  card_filter = Util.FalseFunc,
  target_filter = function(self, player, to_select, selected, selected_cards)
    return
      #selected < 2 and
      to_select ~= player and
      not to_select:isNude()
  end,
  on_use = function(self, room, effect)
    ---@type string
    local skillName = mouQuhu.name
    local player = effect.from
    local targets = effect.tos
    table.insert(targets, player)

    local req = Request:new(targets, "AskForUseActiveSkill")
    req.focus_text = skillName
    local extraData = {
      num = 999,
      min_num = 1,
      include_equip = true,
      pattern = ".",
      reason = skillName,
    }
    local data = { "choose_cards_skill", "", false, extraData }
    data[2] = "#mou__quhu-target::" .. targets[2].id
    req:setData(targets[1], data)
    req:setDefaultReply(targets[1], room:tableRandomPick(targets[1]:getCardIds("he")))
    data[2] = "#mou__quhu-target::" .. targets[1].id
    req:setData(targets[2], data)
    req:setDefaultReply(targets[2], room:tableRandomPick(targets[2]:getCardIds("he")))
    data[2] = "#mou__quhu-user"
    req:setData(player, data)
    req:setDefaultReply(player, room:tableRandomPick(player:getCardIds("he")))
    req:ask()

    local moveInfos = {}
    for _, p in ipairs(targets) do
      local quhuCards = {}
      local result = req:getResult(p)
      if result ~= "" then
        if type(result) == "table" then
          quhuCards = result.card.subcards
        else
          quhuCards = { result }
        end
      end

      table.insert(moveInfos, {
        ids = quhuCards,
        from = p,
        to = p,
        toArea = Card.PlayerSpecial,
        moveReason = fk.ReasonJustMove,
        skillName = skillName,
        specialName = "$mou__quhu",
        moveVisible = false,
        proposer = p,
      })
    end

    room:moveCards(table.unpack(moveInfos))
    room:delay(2000)

    local targetOne = effect.tos[1]
    local targetTwo = effect.tos[2]

    local mostPut = targetOne
    if #targetOne:getPile("$mou__quhu") < #targetTwo:getPile("$mou__quhu") then
      mostPut = targetTwo
    elseif #targetOne:getPile("$mou__quhu") == #targetTwo:getPile("$mou__quhu") then
      local nearestTarget = player
      for i = 1, #room.players - 1 do
        nearestTarget = nearestTarget.next

        if table.contains(targets, nearestTarget) then
          mostPut = nearestTarget
          break
        end
      end
    end
    if table.find(targets, function(p) return player ~= p and #player:getPile("$mou__quhu") >= #p:getPile("$mou__quhu") end) then
      room:damage({
        from = mostPut,
        to = mostPut == targetOne and targetTwo or targetOne,
        damage = 1,
        skillName = skillName,
      })

      room:obtainCard(mostPut, player:getPile("$mou__quhu"), false, fk.ReasonPrey)

      room:moveCards(
        {
          ids = targetOne:getPile("$mou__quhu"),
          from = targetOne,
          toArea = Card.DiscardPile,
          moveReason = fk.ReasonPutIntoDiscardPile,
          skillName = skillName,
          proposer = targetOne,
        },
        {
          ids = targetTwo:getPile("$mou__quhu"),
          from = targetTwo,
          toArea = Card.DiscardPile,
          moveReason = fk.ReasonPutIntoDiscardPile,
          skillName = skillName,
          proposer = targetTwo,
        }
      )
    else
      room:obtainCard(mostPut, player:getPile("$mou__quhu"), false, fk.ReasonPrey)

      room:moveCards(
        {
          ids = targetOne:getPile("$mou__quhu"),
          from = targetOne,
          to = targetOne,
          toArea = Card.PlayerHand,
          moveReason = fk.ReasonPrey,
          skillName = skillName,
          proposer = targetOne,
        },
        {
          ids = targetTwo:getPile("$mou__quhu"),
          from = targetTwo,
          to = targetTwo,
          toArea = Card.PlayerHand,
          moveReason = fk.ReasonPrey,
          skillName = skillName,
          proposer = targetTwo,
        }
      )
    end
  end,
})

return mouQuhu
