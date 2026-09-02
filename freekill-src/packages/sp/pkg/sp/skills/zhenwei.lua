local zhenwei = fk.CreateSkill {
  name = "zhenwei",
}

Fk:loadTranslationTable{
  ["zhenwei"] = "镇卫",
  [":zhenwei"] = "当一名其他角色成为【杀】或黑色锦囊牌的唯一目标时，若该角色的体力值小于你，你可以弃置一张牌并选择一项："..
  "1.摸一张牌，然后你成为此牌的目标；2.令此牌失效并将之移出游戏，回合结束时使用者收回此牌。",

  ["#zhenwei-invoke"] = "镇卫：%src 对 %dest 使用%arg，你可以弃置一张牌执行一项",
  ["zhenwei_transfer"] = "摸一张牌并将%arg转移给你",
  ["zhenwei_recycle"] = "取消%arg，回合结束时%dest将之收回",

  ["$zhenwei1"] = "再敢来犯，仍叫你无功而返！",
  ["$zhenwei2"] = "江夏防线，固若金汤！",
}

zhenwei:addEffect(fk.TargetConfirming, {
  anim_type = "defensive",
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(zhenwei.name) and not player:isNude() and data.from ~= player and
      (data.card.trueName == "slash" or (data.card.type == Card.TypeTrick and data.card.color == Card.Black)) and
      data:isOnlyTarget(target) and target.hp < player.hp and not data.cancelled
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local success, dat = room:askToUseActiveSkill(player, {
      skill_name = "zhenwei_active",
      prompt = "#zhenwei-invoke:"..data.from.id..":"..data.to.id..":"..data.card:toLogString(),
      cancelable = true,
      extra_data = {
        from = data.from.id,
        card = data.card:toLogString(),
      }
    })
    if success and dat then
      event:setCostData(self, {tos = {target}, choice = dat.interaction, cards = dat.cards})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local choice = event:getCostData(self).choice
    room:throwCard(event:getCostData(self).cards, zhenwei.name, player, player)
    if choice:startsWith("zhenwei_transfer") then
      if not player.dead then
        player:drawCards(1, zhenwei.name)
      end
      if not data.from:isProhibited(player, data.card) and not player.dead and data:cancelCurrentTarget() then
        data:addTarget(player)
      end
    else
      data.use.nullifiedTargets = table.simpleClone(room.players)
      if not data.from.dead and room:getCardArea(data.card) == Card.Processing then
        data.from:addToPile(zhenwei.name, data.card, true, zhenwei.name)
      end
    end
  end,
})

zhenwei:addEffect(fk.TurnEnd, {
  mute = true,
  is_delay_effect = true,
  can_trigger = function(self, event, target, player, data)
    return #player:getPile(zhenwei.name) > 0
  end,
  on_cost = Util.TrueFunc,
  on_use = function(self, event, target, player, data)
    player.room:moveCardTo(player:getPile(zhenwei.name), Card.PlayerHand, player, fk.ReasonJustMove)
  end,
})

return zhenwei
