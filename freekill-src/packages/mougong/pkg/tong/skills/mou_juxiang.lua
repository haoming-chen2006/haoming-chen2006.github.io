local mouJuxiang = fk.CreateSkill({
  name = "mou__juxiang",
  tags = { Skill.Compulsory },
})

Fk:loadTranslationTable{
  ["mou__juxiang"] = "巨象",
  [":mou__juxiang"] = "锁定技，【南蛮入侵】对你无效；当其他角色使用的【南蛮入侵】结算结束后，你获得之。"..
  "结束阶段，若你本回合未使用过【南蛮入侵】，你随机将游戏外一张【南蛮入侵】交给一名角色（游戏外共有2张【南蛮入侵】）。",

  ["#mou__juxiang-choose"] = "巨象：选择1名角色获得【南蛮入侵】",

  ["$mou__juxiang1"] = "哼！何须我亲自出马！",
  ["$mou__juxiang2"] = "都给我留下吧！",
}

mouJuxiang:addEffect(fk.PreCardEffect, {
  anim_type = "defensive",
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(mouJuxiang.name) and data.card.trueName == "savage_assault" and data.to == player
  end,
  on_use = function(self, event, target, player, data)
    data.nullified = true
  end,
})

mouJuxiang:addEffect(fk.CardUseFinished, {
  anim_type = "defensive",
  can_trigger = function(self, event, target, player, data)
    if player:hasSkill(mouJuxiang.name) and target ~= player and data.card.trueName == "savage_assault" then
      local room = player.room
      local card_ids = data.card:isVirtual() and data.card.subcards or { data.card.id }
      return #card_ids > 0 and table.every(card_ids, function (id)
        return room:getCardArea(id) == Card.Processing
      end)
    end
  end,
  on_use = function(self, event, target, player, data)
    player.room:obtainCard(player, data.card, true, fk.ReasonJustMove)
  end,
})

local juxiang_derivecards = { {"savage_assault", Card.Spade, 7}, {"savage_assault", Card.Club, 7} }

mouJuxiang:addEffect(fk.EventPhaseStart, {
  anim_type = "defensive",
  can_trigger = function(self, event, target, player, data)
    if player:hasSkill(mouJuxiang.name) and target == player and player.phase == Player.Finish then
      local room = player.room
      return
      table.find(room:prepareDeriveCards(juxiang_derivecards, "mou_juxiang_derivecards"), function (id)
        return room:getCardArea(id) == Card.Void
      end) and
      #player.room.logic:getEventsOfScope(GameEvent.UseCard, 1, function (e)
        local use = e.data
        return use.from == player and use.card.trueName == "savage_assault"
      end, Player.HistoryTurn) == 0
    end
  end,
  on_use = function(self, event, target, player, data)
    ---@type string
    local skillName = mouJuxiang.name
    local room = player.room
    local cards = table.filter(room:prepareDeriveCards(juxiang_derivecards, "mou_juxiang_derivecards"), function (id)
      return room:getCardArea(id) == Card.Void
    end)
    if #cards == 0 then return false end
    local targets = room:askToChoosePlayers(
      player,
      {
        targets = room.alive_players,
        min_num = 1,
        max_num = 1,
        prompt = "#mou__juxiang-choose",
        skill_name = skillName,
        cancelable = false
      }
    )
    if #targets > 0 then
      room:moveCards({
        ids = room:tableRandomPick(cards, 1),
        to = targets[1],
        toArea = Card.PlayerHand,
        moveReason = fk.ReasonGive,
        proposer = player,
        skillName = skillName,
        moveVisible = true,
      })
    end
  end,
})

return mouJuxiang
