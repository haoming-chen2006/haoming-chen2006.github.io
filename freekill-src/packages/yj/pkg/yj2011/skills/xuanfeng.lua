
local xuanfeng = fk.CreateSkill {
  name = "xuanfeng"
}

Fk:loadTranslationTable{
  ["xuanfeng"] = "旋风",
  [":xuanfeng"] = "当你失去装备区里的牌后，或弃牌阶段结束时，若你于此阶段内弃置过你的至少两张手牌，你可以依次弃置至多两名其他角色共计两张牌。",

  ["#xuanfeng-choose"] = "旋风：你可以依次弃置一至两名角色的共计两张牌",

  ["$xuanfeng1"] = "伤敌于千里之外！",
  ["$xuanfeng2"] = "索命于须臾之间！",
}

local spec = {
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local targets = table.filter(room:getOtherPlayers(player, false), function (p)
      return not p:isNude()
    end)
    local to = room:askToChoosePlayers(player, {
      skill_name = xuanfeng.name,
      min_num = 1,
      max_num = 1,
      targets = targets,
      prompt = "#xuanfeng-choose",
      cancelable = true,
    })
    if #to > 0 then
      event:setCostData(self, {tos = to})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local to = event:getCostData(self).tos[1]
    local card = room:askToChooseCard(player, {
      target = to,
      flag = "he",
      skill_name = xuanfeng.name,
    })
    room:throwCard(card, xuanfeng.name, to, player)
    if player.dead then return false end
    local targets = table.filter(room:getOtherPlayers(player, false), function (p)
      return not p:isNude()
    end)
    if #targets > 0 then
      to = room:askToChoosePlayers(player, {
      targets = targets,
      min_num = 1,
      max_num = 1,
      prompt = "#xuanfeng-choose",
      skill_name = xuanfeng.name,
      cancelable = true,
      })
      if #to > 0 then
      to = to[1]
      card = room:askToChooseCard(player, {
        target = to,
        flag = "he",
        skill_name = xuanfeng.name,
      })
      room:throwCard(card, xuanfeng.name, to, player)
      end
    end
  end,
}

xuanfeng:addEffect(fk.AfterCardsMove, {
  anim_type = "control",
  can_trigger = function(self, event, target, player, data)
    if player:hasSkill(xuanfeng.name) then
      for _, move in ipairs(data) do
        if move.from == player then
          for _, info in ipairs(move.moveInfo) do
            if info.fromArea == Card.PlayerEquip then
              return table.find(player.room:getOtherPlayers(player, false), function (p)
                return not p:isNude()
              end)
            end
          end
        end
      end
    end
  end,
  on_cost = spec.on_cost,
  on_use = spec.on_use,
})

xuanfeng:addEffect(fk.EventPhaseEnd, {
  anim_type = "control",
  can_trigger = function(self, event, target, player, data)
    if target == player and player:hasSkill(xuanfeng.name) and player.phase == Player.Discard and
      table.find(player.room:getOtherPlayers(player, false), function (p)
        return not p:isNude()
      end) then
      local n = 0
      player.room.logic:getEventsOfScope(GameEvent.MoveCards, 1, function (e)
        for _, move in ipairs(e.data) do
          if move.from == player and move.moveReason == fk.ReasonDiscard then
            for _, info in ipairs(move.moveInfo) do
              if info.fromArea == Card.PlayerHand then
                n = n + 1
                if n > 1 then return true end
              end
            end
          end
        end
      end, Player.HistoryPhase)
      return n > 1
    end
  end,
  on_cost = spec.on_cost,
  on_use = spec.on_use,
})

return xuanfeng
