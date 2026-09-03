local chengbian_viewas = fk.CreateSkill {
  name = "chengbian_viewas&",
}

Fk:loadTranslationTable{
  ["chengbian_viewas&"] = "乘变",
  [":chengbian_viewas&"] = "你可以将至少一半手牌当一张【杀】打出",

  ["#chengbian_viewas"] = "乘变：你可以将至少一半手牌当一张【杀】打出",
}

chengbian_viewas:addEffect("viewas", {
  mute = true,
  pattern = "slash",
  prompt = "#chengbian_viewas",
  card_filter = function(self, player, to_select, selected)
    return table.contains(player:getCardIds("h"), to_select)
  end,
  view_as = function(self, player, cards)
    if #cards < player:getHandcardNum() / 2 then return end
    local c = Fk:cloneCard("slash")
    c.skillName = chengbian_viewas.name
    c:addSubcards(cards)
    return c
  end,
  enabled_at_play = Util.FalseFunc,
  enabled_at_response = function (self, player, response)
    return response and not player:isKongcheng()
  end
})

chengbian_viewas:addAI(nil, "vs_skill")

return chengbian_viewas
