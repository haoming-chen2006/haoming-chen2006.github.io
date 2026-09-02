local xiansi_viewas = fk.CreateSkill {
  name = "xiansi&",
}

Fk:loadTranslationTable {
  ["xiansi&"] = "陷嗣",
  [":xiansi&"] = "当你需使用【杀】时，你可以弃置刘封的两张“逆”，视为对其使用一张【杀】。",

  ["#xiansi&"] = "陷嗣：你可以移去刘封的两张“逆”，视为对其使用一张【杀】",
}

xiansi_viewas:addEffect("viewas", {
  mute = true,
  pattern = "slash",
  prompt = "#xiansi&",
  filter_pattern = {
    min_num = 0,
    max_num = 0,
    pattern = "",
    subcards = {}
  },
  card_filter = Util.FalseFunc,
  view_as = function(self, player, cards)
    local c = Fk:cloneCard("slash")
    c.skillName = "xiansi"
    return c
  end,
  before_use = function(self, player, use)
    local room = player.room
    local src = table.find(use.tos, function(p)
      return p:hasSkill("xiansi") and #p:getPile("liufeng_ni") > 1
    end)
    if src == nil then return "" end
    player:broadcastSkillInvoke("xiansi", room:tableRandomPick { 3, 4 })
    room:notifySkillInvoked(player, "xiansi", "negative")
    local cards = room:askToChooseCards(player, {
      target = src,
      skill_name = "xiansi&",
      min = 2,
      max = 2,
      prompt = "#xiansi&",
      flag = { card_data = { { "liufeng_ni", src:getPile("liufeng_ni") } } },
    })
    room:moveCardTo(cards, Card.DiscardPile, nil, fk.ReasonPutIntoDiscardPile, "xiansi", nil, true, player)
  end,
  enabled_at_play = function(self, player)
    return table.find(Fk:currentRoom().alive_players, function(p)
      return p ~= player and p:hasSkill("xiansi") and #p:getPile("liufeng_ni") > 1
    end)
  end,
  enabled_at_response = function(self, player, response)
    return not response and table.find(Fk:currentRoom().alive_players, function(p)
      return p ~= player and p:hasSkill("xiansi") and #p:getPile("liufeng_ni") > 1
    end)
  end,
})

xiansi_viewas:addEffect("prohibit", {
  is_prohibited = function(self, from, to, card)
    return table.contains(card.skillNames, "xiansi") and
        not (to:hasSkill("xiansi") and #to:getPile("liufeng_ni") > 1)
  end,
})

xiansi_viewas:addAI(nil, "vs_skill")

return xiansi_viewas
