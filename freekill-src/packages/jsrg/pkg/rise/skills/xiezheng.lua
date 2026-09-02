local xiezheng = fk.CreateSkill {
  name = "xiezheng",
}

Fk:loadTranslationTable{
  ["xiezheng"] = "挟征",
  [":xiezheng"] = "结束阶段，你可以令至多三名角色依次将一张手牌置于牌堆顶，然后视为你使用一张【兵临城下】，结算后若未造成过伤害，你失去1点体力。",

  ["#xiezheng-choose"] = "挟征：令至多三名角色依次将一张手牌置于牌堆顶，然后你视为使用一张【兵临城下】！",
  ["#xiezheng-ask"] = "挟征：%src 将视为使用【兵临城下】！请将一张手牌置于牌堆顶",
  ["#xiezheng-use"] = "挟征：视为使用一张【兵临城下】！若未造成伤害，你失去1点体力",

  ["$xiezheng1"] = "烈祖明皇帝乘舆仍出，陛下何妨效之。",
  ["$xiezheng2"] = "陛下宜誓临戎，使将士得凭天威。",
}

xiezheng:addEffect(fk.EventPhaseStart, {
  anim_type = "offensive",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(xiezheng.name) and player.phase == Player.Finish and
      table.find(player.room.alive_players, function (p)
        return not p:isKongcheng()
      end)
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local targets = table.filter(room.alive_players, function (p)
      return not p:isKongcheng()
    end)
    local tos = room:askToChoosePlayers(player, {
      targets = targets,
      min_num = 1,
      max_num = 3,
      prompt = "#xiezheng-choose",
      skill_name = xiezheng.name,
      cancelable = true,
    })
    if #tos > 0 then
      room:sortByAction(tos)
      event:setCostData(self, {tos = tos})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    for _, p in ipairs(event:getCostData(self).tos) do
      if not p.dead and not p:isKongcheng() then
        local card = room:askToCards(p, {
          min_num = 1,
          max_num = 1,
          include_equip = false,
          skill_name = xiezheng.name,
          prompt = "#xiezheng-ask:"..player.id,
          cancelable = false,
        })
        room:moveCards({
          ids = card,
          from = p,
          toArea = Card.DrawPile,
          moveReason = fk.ReasonPut,
          skillName = xiezheng.name,
        })
      end
    end
    if player.dead then return end
    local use = room:askToUseVirtualCard(player, {
      name = "enemy_at_the_gates",
      skill_name = xiezheng.name,
      prompt = "#xiezheng-use",
      cancelable = false,
    })
    if use and not player.dead and not (use.extra_data and use.extra_data.xiezheng_damageDealt) then
      room:loseHp(player, 1, xiezheng.name)
    end
  end,
})

xiezheng:addEffect(fk.Damage, {
  can_refresh = function(self, event, target, player, data)
    return target == player and data.card and data.card.trueName == "slash"
  end,
  on_refresh = function(self, event, target, player, data)
    local e = player.room.logic:getCurrentEvent().parent
    while e do
      if e.event == GameEvent.UseCard then
        local use = e.data
        if use.card.name == "enemy_at_the_gates" and table.contains(use.card.skillNames, xiezheng.name) then
          use.extra_data = use.extra_data or {}
          use.extra_data.xiezheng_damageDealt = true
          return
        end
      end
      e = e.parent
    end
  end,
})

return xiezheng
