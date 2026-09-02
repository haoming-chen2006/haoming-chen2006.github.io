local zhaotu = fk.CreateSkill {
  name = "zhaotu",
}

Fk:loadTranslationTable{
  ["zhaotu"] = "招图",
  [":zhaotu"] = "每轮限一次，你可以将一张红色非锦囊牌当做【乐不思蜀】使用，此回合结束后，目标执行一个手牌上限-2的回合。",

  ["#zhaotu"] = "招图：将一张红色非锦囊牌当【乐不思蜀】使用，目标执行一个手牌上限-2的额外回合",
  ["@@zhaotu-turn"] = "招图",

  ["$zhaotu1"] = "卿持此诏，惟盈惟谨，勿蹈山阳公覆辙。",
  ["$zhaotu2"] = "司马师觑百官如草芥，社稷早晚必归此人。",
}

zhaotu:addEffect("viewas", {
  anim_type = "control",
  pattern = "indulgence",
  prompt = "#zhaotu",
  card_filter = function(self, player, to_select, selected)
    if #selected == 1 then return end
    local card = Fk:getCardById(to_select)
    return card.color == Card.Red and card.type ~= Card.TypeTrick
  end,
  view_as = function(self, player, cards)
    if #cards ~= 1 then return end
    local c = Fk:cloneCard("indulgence")
    c.skillName = zhaotu.name
    c:addSubcard(cards[1])
    return c
  end,
  before_use = function (self, player, use)
    for _, p in ipairs(use.tos) do
      p:gainAnExtraTurn(true, zhaotu.name)
    end
  end,
  enabled_at_play = function(self, player)
    return player:usedSkillTimes(zhaotu.name, Player.HistoryRound) == 0
  end,
  enabled_at_response = function (self, player, response)
    return not response
  end,
})

zhaotu:addEffect(fk.TurnStart, {
  can_refresh = function(self, event, target, player, data)
    return target == player and data.reason == zhaotu.name
  end,
  on_refresh = function(self, event, target, player, data)
    player.room:addPlayerMark(player, MarkEnum.MinusMaxCardsInTurn, 2)
  end,
})

return zhaotu
