local guanjue = fk.CreateSkill{
  name = "guanjue",
  tags = { Skill.Compulsory },
}

Fk:loadTranslationTable{
  ["guanjue"] = "冠绝",
  [":guanjue"] = "锁定技，当你使用或打出一张牌时，所有其他角色不能使用或打出此花色的牌直到回合结束。",

  ["@[suits]guanjue-turn"] = "冠绝",

  ["$guanjue1"] = "河北诸将，以某观之，如土鸡瓦狗！",
  ["$guanjue2"] = "小儿舞刀，不值一哂。",
}

guanjue:addEffect(fk.CardUsing, {
  anim_type = "offensive",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(guanjue.name) and
      data.card.suit ~= Card.NoSuit and
      table.find(player.room:getOtherPlayers(player, false), function (p)
        return not table.contains(p:getTableMark("@[suits]guanjue-turn"), data.card.suit)
      end)
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    for _, p in ipairs(room:getOtherPlayers(player, false)) do
      room:doIndicate(player, {p})
      room:addTableMarkIfNeed(p, "@[suits]guanjue-turn", data.card.suit)
    end
  end,
})

guanjue:addEffect(fk.CardResponding, {
  anim_type = "offensive",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(guanjue.name) and
      data.card.suit ~= Card.NoSuit and
      table.find(player.room:getOtherPlayers(player, false), function (p)
        return not table.contains(p:getTableMark("@[suits]guanjue-turn"), data.card.suit)
      end)
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    for _, p in ipairs(room:getOtherPlayers(player, false)) do
      room:doIndicate(player, {p})
      room:addTableMarkIfNeed(p, "@[suits]guanjue-turn", data.card.suit)
    end
  end,
})

guanjue:addEffect("prohibit", {
  prohibit_use = function(self, player, card)
    return card and table.contains(player:getTableMark("@[suits]guanjue-turn"), card.suit)
  end,
  prohibit_response = function(self, player, card)
    return card and table.contains(player:getTableMark("@[suits]guanjue-turn"), card.suit)
  end,
})

return guanjue
