local liaoshi = fk.CreateSkill {
  name = "mou__liaoshi",
}

Fk:loadTranslationTable {
  ["mou__liaoshi"] = "料势",
  [":mou__liaoshi"] = "每回合限一次，你可以将因〖巧变〗获得的牌当【杀】或【闪】使用或打出。",

  ["#mou__liaoshi"] = "料势：你可以将一张“巧变”获得的牌当【杀】或【闪】使用或打出",

  ["$mou__liaoshi1"] = "能而示之不能，用而示之不用。",
  ["$mou__liaoshi2"] = "欲攻其东，先击其西，敌必分兵救之。",
}

liaoshi:addEffect("viewas", {
  pattern = "slash,jink",
  prompt = "#mou__liaoshi",
  interaction = function(self, player)
    local all_names = { "slash", "fire__slash", "thunder__slash", "jink" }
    local names = player:getViewAsCardNames(liaoshi.name, all_names)
    if #names == 0 then return end
    return UI.CardNameBox { choices = names, all_choices = all_names }
  end,
  filter_pattern = {
    max_num = 1,
    min_num = 1,
    pattern = "slash,jink",
  },
  card_filter = function(self, player, to_select, selected)
    return #selected == 0 and Fk:getCardById(to_select):getMark("@@mou__qiaobian-inhand") > 0
  end,
  view_as = function(self, player, cards)
    if #cards ~= 1 or self.interaction.data == nil then return nil end
    local card = Fk:cloneCard(self.interaction.data)
    card:addSubcard(cards[1])
    card.skillName = liaoshi.name
    return card
  end,
  enabled_at_play = function(self, player)
    return player:usedSkillTimes(liaoshi.name, Player.HistoryTurn) == 0
  end,
  enabled_at_response = function(self, player, response)
    return player:usedSkillTimes(liaoshi.name, Player.HistoryTurn) == 0
  end,
})

return liaoshi
