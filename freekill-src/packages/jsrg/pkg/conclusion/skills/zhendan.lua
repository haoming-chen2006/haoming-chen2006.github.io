local zhendan = fk.CreateSkill {
  name = "zhendan",
}

Fk:loadTranslationTable{
  ["zhendan"] = "镇胆",
  [":zhendan"] = "你可以将一张非基本手牌当任意基本牌使用或打出；当你受到伤害后或每轮结束时，你摸X张牌，然后此技能本轮失效"..
  "（X为本轮所有角色执行过的回合数且至多为5）。",

  ["#zhendan"] = "镇胆：你可以将一张非基本牌当基本牌使用或打出",

  ["$zhendan1"] = "匹马行南北，何暇问死生！",
  ["$zhendan2"] = "纵千万人，吾往矣！",
}

zhendan:addEffect("viewas", {
  pattern = ".|.|.|.|.|basic",
  prompt = "#zhendan",
  interaction = function(self, player)
    local all_names = Fk:getAllCardNames("b")
    local names = player:getViewAsCardNames(zhendan.name, all_names)
    if #names > 0 then
      return UI.CardNameBox { choices = names, all_choices = all_names }
    end
  end,
  handly_pile = true,
  card_filter = function(self, player, to_select, selected)
    return #selected == 0 and Fk:getCardById(to_select).type ~= Card.TypeBasic and table.contains(player:getHandlyIds(), to_select)
  end,
  view_as = function(self, player, cards)
    if #cards ~= 1 or not self.interaction.data then return end
    local card = Fk:cloneCard(self.interaction.data)
    card:addSubcards(cards)
    card.skillName = zhendan.name
    return card
  end,
})

local spec = {
  on_use = function(self, event, target, player, data)
    local room = player.room
    local num = #room.logic:getEventsOfScope(GameEvent.Turn, 5, Util.TrueFunc, Player.HistoryRound)
    player:drawCards(math.min(num, 5), zhendan.name)
    room:invalidateSkill(player, "zhendan", "-round")
  end,
}

zhendan:addEffect(fk.Damaged, {
  anim_type = "masochism",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(zhendan.name)
  end,
  on_cost = Util.TrueFunc,
  on_use = spec.on_use,
})

zhendan:addEffect(fk.RoundEnd, {
  anim_type = "drawcard",
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(zhendan.name)
  end,
  on_cost = Util.TrueFunc,
  on_use = spec.on_use,
})

return zhendan
