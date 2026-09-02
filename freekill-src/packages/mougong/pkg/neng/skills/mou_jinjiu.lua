local mouJinjiu = fk.CreateSkill({
  name = "mou__jinjiu",
  tags = { Skill.Compulsory },
})

Fk:loadTranslationTable{
  ["mou__jinjiu"] = "禁酒",
  [":mou__jinjiu"] = "锁定技，你的【酒】均视为【杀】；当你受到【酒】【杀】造成的伤害时，此伤害改为1；你的回合内，其他角色不能使用【酒】；" ..
  "当与你拼点的角色拼点牌亮出后，若此牌为【酒】，则此牌的点数视为1。",
  ["#mou__jinjiu_trigger"] = "禁酒",
  ["#mou__jinjiu_prohibit"] = "禁酒",

  ["$mou__jinjiu1"] = "军规严戒，不容稍纵形骸！",
  ["$mou__jinjiu2"] = "黄汤乱军误事，不可不禁！",
}

mouJinjiu:addEffect("filter", {
  anim_type = "offensive",
  card_filter = function(self, card, player, isJudgeEvent)
    return
      player:hasSkill(mouJinjiu.name) and
      card.name == "analeptic" and
      (table.contains(player.player_cards[Player.Hand], card.id) or isJudgeEvent)
  end,
  view_as = function(self, player, to_select)
    return Fk:cloneCard("slash", to_select.suit, to_select.number)
  end,
})

mouJinjiu:addEffect(fk.DamageInflicted, {
  anim_type = "defensive",
  can_trigger = function(self, event, target, player, data)
    if not (target == player and player:hasSkill(mouJinjiu.name) and data.card and data.card.trueName == "slash") then
      return false
    end

    local parentUseData = player.room.logic:getCurrentEvent():findParent(GameEvent.UseCard)
    if parentUseData then
      local drankBuff = parentUseData and (parentUseData.data.extra_data or {}).drankBuff or 0
      if drankBuff > 0 then
        event:setCostData(self, drankBuff)
        return true
      end
    end

    return false
  end,
  on_use = function(self, event, target, player, data)
    data.damage = 1
  end,
})

mouJinjiu:addEffect(fk.PindianCardsDisplayed, {
  anim_type = "control",
  can_trigger = function(self, event, target, player, data)
    if not player:hasSkill(mouJinjiu.name) then
      return false
    end

    if data.from == player then
      for _, result in pairs(data.results) do
        if result.toCard.name == "analeptic" then
          return true
        end
      end
    elseif table.contains(data.tos, player) then
      return data.fromCard.name == "analeptic"
    end

    return false
  end,
  on_use = function(self, event, target, player, data)
    if data.from == player then
      for _, result in pairs(data.results) do
        if result.toCard.name == "analeptic" then
          result.toCard.number = 1
        end
      end
    else
      data.fromCard.number = 1
    end
  end,
})

mouJinjiu:addEffect("prohibit", {
  prohibit_use = function(self, player, card)
    if card and card.name == "analeptic" then
      return table.find(Fk:currentRoom().alive_players, function(p)
        return p.phase ~= Player.NotActive and p:hasSkill(mouJinjiu.name) and p ~= player
      end)
    end
  end,
})

return mouJinjiu
