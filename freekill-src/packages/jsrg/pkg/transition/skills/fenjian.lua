local fenjian = fk.CreateSkill {
  name = "fenjian",
}

Fk:loadTranslationTable{
  ["fenjian"] = "奋剑",
  [":fenjian"] = "每回合各限一次，当你需要对其他角色使用【决斗】或【桃】时，你可以令你受到的伤害+1直到本回合结束，然后你视为使用之。",

  ["#fenjian"] = "奋剑：令你本回合受到的伤害+1，视为使用一张【决斗】或【桃】",
  ["@fenjian-turn"] = "奋剑",
}

fenjian:addEffect("viewas", {
  mute = true,
  pattern = "duel,peach",
  prompt = "#fenjian",
  interaction = function(self, player)
    local all_names = {"duel", "peach"}
    local names = player:getViewAsCardNames(fenjian.name, all_names, nil, player:getTableMark("fenjian-turn"))
    return UI.CardNameBox { choices = names, all_choices = all_names }
  end,
  card_filter = Util.FalseFunc,
  view_as = function(self, player, cards)
    if self.interaction.data == nil then return end
    local card = Fk:cloneCard(self.interaction.data)
    card.skillName = fenjian.name
    return card
  end,
  before_use = function(self, player, use)
    local room = player.room
    player:broadcastSkillInvoke(fenjian.name)
    if self.interaction.data == "duel" then
      room:notifySkillInvoked(player, fenjian.name, "offensive")
    else
      room:notifySkillInvoked(player, fenjian.name, "support")
    end
    room:addPlayerMark(player, "@fenjian-turn", 1)
    room:addTableMark(player, "fenjian-turn", use.card.trueName)
  end,
  enabled_at_play = function(self, player)
    return #player:getViewAsCardNames(fenjian.name, {"duel", "peach"}, nil, player:getTableMark("fenjian-turn")) > 0
  end,
  enabled_at_response = function(self, player, response)
    return not response and #player:getViewAsCardNames(fenjian.name, {"duel", "peach"}, nil, player:getTableMark("fenjian-turn")) > 0
  end,
})

fenjian:addEffect("prohibit", {
  is_prohibited = function(self, from, to, card)
    return card and table.contains(card.skillNames, fenjian.name) and from == to
  end,
})

fenjian:addEffect(fk.DamageInflicted, {
  anim_type = "negative",
  is_delay_effect = true,
  can_trigger = function(self, event, target, player, data)
    return target == player and player:getMark("@fenjian-turn") > 0
  end,
  on_use = function(self, event, target, player, data)
    data:changeDamage(player:getMark("@fenjian-turn"))
  end,
})

return fenjian
