local mouLiegong = fk.CreateSkill({
  name = "mou__liegong",
})

Fk:loadTranslationTable{
  ["mou__liegong"] = "烈弓",
  [":mou__liegong"] = "若你未装备武器，你的【杀】只能当作普通【杀】使用或打出。"
    .. "你使用牌时或成为其他角色使用牌的目标后，若此牌的花色未被“烈弓”记录，"
    .. "则记录此种花色。当你使用【杀】指定唯一目标后，你可以亮出牌堆顶的X张牌"
    .. "（X为你记录的花色数-1，且至少为0），然后每有一张牌花色与“烈弓”记录的"
    .. "花色相同，你令此【杀】伤害+1，且其不能使用“烈弓”记录花色的牌响应此"
    .. "【杀】。若如此做，此【杀】结算结束后，清除“烈弓”记录的花色。",

  ["@mouliegongRecord"] = "烈弓",
  ["#mou__liegong_filter"] = "烈弓",
  ["#mou__liegong-invoke"] = "对 %src 发动“烈弓”：其不能使用你记录花色的【闪】，且可能加伤",

  ["$mou__liegong1"] = "矢贯坚石，劲冠三军！",
  ["$mou__liegong2"] = "吾虽年迈，箭矢犹锋！",
}

mouLiegong:addEffect("filter", {
  card_filter = function(self, card, player)
    return
      card.trueName == "slash" and
      card.name ~= "slash" and
      not player:getEquipment(Card.SubtypeWeapon) and
      player:hasSkill(mouLiegong.name) and
      table.contains(player:getCardIds("h"), card.id)
  end,
  view_as = function(self, player, card)
    local c = Fk:cloneCard("slash", card.suit, card.number)
    c.skillName = mouLiegong.name
    return c
  end,
})

mouLiegong:addEffect(fk.TargetSpecified, {
  anim_type = "offensive",
  can_trigger = function(self, event, target, player, data)
    return
      target == player and
      player:hasSkill(mouLiegong.name) and
      data.card.trueName == "slash" and
      data:isOnlyTarget(data.to) and
      player:getMark("@mouliegongRecord") ~= 0
  end,
  on_cost = function(self, event, target, player, data)
    return player.room:askToSkillInvoke(player, { skill_name = mouLiegong.name, prompt = "#mou__liegong-invoke:" .. data.to.id })
  end,
  on_use = function(self, event, target, player, data)
    ---@type string
    local skillName = mouLiegong.name
    local room = player.room

    -- 让他不能出闪
    local suits = player:getMark("@mouliegongRecord")
    data.extra_data = data.extra_data or {}
    data.extra_data.mou__liegong_suits = data.extra_data.mou__liegong_suits or {}
    data.extra_data.mou__liegong_suits[data.to.id] = suits

    -- 展示牌堆顶的牌，计算加伤数量
    if #suits > 1 then
      local cards = room:getNCards(#suits - 1)
      room:moveCardTo(cards, Card.Processing, nil, fk.ReasonJustMove, skillName, nil, true, player.id)
      data.additionalDamage = data.additionalDamage or 0
      for _, id in ipairs(cards) do
        if table.contains(suits, Fk:getCardById(id):getSuitString(true)) then
          room:setCardEmotion(id, "judgegood")
          data.additionalDamage = data.additionalDamage + 1
        else
          room:setCardEmotion(id, "judgebad")
        end
        room:delay(200)
      end
      room:moveCardTo(cards, Card.DiscardPile, nil, fk.ReasonPutIntoDiscardPile, skillName)
    end
  end,
})

local recordSuitCanRefresh = function(self, event, target, player, data)
  return target == player and player:hasSkill(mouLiegong.name) and data.card.suit ~= Card.NoSuit
end

local recordSuitOnRefresh = function(self, event, target, player, data)
  local suit = data.card:getSuitString(true)
  local record = player:getTableMark("@mouliegongRecord")
  if table.insertIfNeed(record, suit) then
    player.room:setPlayerMark(player, "@mouliegongRecord", record)
  end
end

mouLiegong:addEffect(fk.TargetConfirmed, {
  can_refresh = recordSuitCanRefresh,
  on_refresh = recordSuitOnRefresh,
})

mouLiegong:addEffect(fk.CardUsing, {
  can_refresh = recordSuitCanRefresh,
  on_refresh = recordSuitOnRefresh,
})

mouLiegong:addEffect(fk.CardUseFinished, {
  can_refresh = function(self, event, target, player, data)
    return target == player and data.extra_data and data.extra_data.mou__liegong_suits
  end,
  on_refresh = function(self, event, target, player, data)
    player.room:setPlayerMark(player, "@mouliegongRecord", 0)
  end,
})

mouLiegong:addEffect(fk.HandleAskForPlayCard, {
  can_refresh = function(self, event, target, player, data)
    if data.eventData and data.eventData.to == player then
      local dat = data.eventData.extra_data
      return dat and dat.mou__liegong_suits and dat.mou__liegong_suits[player.id]
    end
  end,
  on_refresh = function(self, event, target, player, data)
    local room = player.room
    if not data.afterRequest then
      room:setBanner("mou__liegong_suits", data.eventData.extra_data.mou__liegong_suits[player.id])
    else
      room:setBanner("mou__liegong_suits", nil)
    end
  end,
})

mouLiegong:addEffect("prohibit", {
  prohibit_use = function(self, player, card)
    local suits = Fk:currentRoom():getBanner("mou__liegong_suits")
    if suits then
      return card.name == "jink" and table.contains(suits, card:getSuitString(true))
    end
  end,
})

mouLiegong:addLoseEffect(function (self, player)
  player.room:setPlayerMark(player, "@mouliegongRecord", 0)
end)

return mouLiegong
