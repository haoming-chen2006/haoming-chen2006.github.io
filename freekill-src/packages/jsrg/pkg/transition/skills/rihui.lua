local rihui = fk.CreateSkill {
  name = "js__rihui",
}

Fk:loadTranslationTable{
  ["js__rihui"] = "日彗",
  [":js__rihui"] = "当你使用【杀】对目标造成伤害后，你可以令判定区内有牌的其他角色各摸一张牌；你于出牌阶段对每名判定区内没有牌的角色使用的\
  首张【杀】无次数限制。",

  ["#js__rihui-invoke"] = "日彗：你可以令判定区内有牌的其他角色各摸一张牌",
}

rihui:addEffect(fk.Damage, {
  anim_type = "support",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(rihui.name) and player.room.logic:damageByCardEffect() and
      data.card and data.card.trueName == "slash" and
      table.find(player.room:getOtherPlayers(player, false), function(p)
        return #p:getCardIds("j") > 0
      end)
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    if room:askToSkillInvoke(player, {
      skill_name = rihui.name,
      prompt = "#js__rihui-invoke",
    }) then
      local tos = table.filter(room:getOtherPlayers(player), function(p)
        return #p:getCardIds("j") > 0
      end)
      event:setCostData(self, {tos = tos})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    for _, p in ipairs(event:getCostData(self).tos) do
      if #p:getCardIds("j") > 0 and not p.dead then
        p:drawCards(1, rihui.name)
      end
    end
  end,
})

rihui:addEffect("targetmod", {
  bypass_times = function(self, player, skill, scope, card, to)
    return player:hasSkill(rihui.name) and skill.trueName == "slash_skill" and to and scope == Player.HistoryPhase and
      #to:getCardIds("j") == 0 and not table.contains(player:getTableMark("rihui_slashed-phase"), to.id)
  end
})

rihui:addEffect(fk.TargetSpecified, {
  can_refresh = function(self, event, target, player, data)
    return target == player and player:hasSkill(rihui.name) and data.card.trueName == "slash" and
      #data.to:getCardIds("j") == 0 and not table.contains(player:getTableMark("rihui_slashed-phase"), data.to.id)
  end,
  on_refresh = function(self, event, target, player, data)
    local room = player.room
    room:addTableMark(player, "rihui_slashed-phase", data.to.id)
    if not data.use.extraUse then
      player:addCardUseHistory(data.card.trueName, -1)
      data.use.extraUse = true
    end
  end,
})

rihui:addAcquireEffect(function (self, player, is_start)
  if not is_start and player.phase == Player.Play then
    local room = player.room
    local targets = {}
    room.logic:getEventsOfScope(GameEvent.UseCard, 1, function(e)
      local use = e.data
      if use.from == player and use.card.trueName == "slash" then
        for _, p in ipairs(use.tos) do
          table.insertIfNeed(targets, p.id)
        end
      end
    end, Player.HistoryPhase)
    room:setPlayerMark(player, "rihui_slashed-phase", targets)
  end
end)

return rihui
