local qingjiao = fk.CreateSkill {
  name = "qingjiaol",
  tags = { Skill.AttachedKingdom },
  attached_kingdom = {"qun"},
}

Fk:loadTranslationTable{
  ["qingjiaol"] = "轻狡",
  [":qingjiaol"] = "群势力技，出牌阶段各限一次，你可以将一张牌当【推心置腹】/【趁火打劫】对一名手牌数大于/小于你的角色使用。",

  ["#qingjiaol-sincere_treat"] = "轻狡：将一张牌当【推心置腹】对一名手牌数大于你的角色使用",
  ["#qingjiaol-looting"] = "轻狡：将一张牌当【趁火打劫】对一名手牌数小于你的角色使用",
}

qingjiao:addEffect("viewas", {
  anim_type = "control",
  prompt = function(self, player, selected_cards)
    return "#qingjiaol-"..self.interaction.data
  end,
  interaction = function(self, player)
    local all_names = {"sincere_treat", "looting"}
    local names = player:getViewAsCardNames(qingjiao.name, {"sincere_treat", "looting"}, nil, player:getTableMark("qingjiaol-phase"),
      {bypass_distances = true})
    return UI.CardNameBox { choices = names, all_choices = all_names }
  end,
  handly_pile = true,
  card_filter = function(self, player, to_select, selected)
    return #selected == 0
  end,
  view_as = function(self, player, cards)
    if #cards ~= 1 or not self.interaction.data then return end
    local card = Fk:cloneCard(self.interaction.data)
    card.skillName = qingjiao.name
    card:addSubcard(cards[1])
    return card
  end,
  before_use = function(self, player, use)
    player.room:addTableMark(player, "qingjiaol-phase", use.card.name)
  end,
  enabled_at_play = function(self, player)
    return #player:getViewAsCardNames(qingjiao.name, {"sincere_treat", "looting"}, nil, player:getTableMark("qingjiaol-phase"),
      {bypass_distances = true}) > 0
  end,
})

qingjiao:addEffect("prohibit", {
  is_prohibited = function(self, from, to, card)
    if card and table.contains(card.skillNames, qingjiao.name) and from then
      if card.name == "sincere_treat" then
        return to:getHandcardNum() <= from:getHandcardNum()
      elseif card.name == "looting" then
        return to:getHandcardNum() >= from:getHandcardNum()
      end
    end
  end,
})

qingjiao:addEffect("targetmod", {
  bypass_distances = function (self, player, skill, card, to)
    return card and table.contains(card.skillNames, qingjiao.name)
  end,
})

qingjiao:addLoseEffect(function (self, player, is_death)
  player.room:setPlayerMark(player, "qingjiaol-phase", 0)
end)

return qingjiao
