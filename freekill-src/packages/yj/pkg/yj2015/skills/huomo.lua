local huomo = fk.CreateSkill {
  name = "huomo",
}

Fk:loadTranslationTable{
  ["huomo"] = "活墨",
  [":huomo"] = "当你需要使用基本牌时（你本回合使用过的基本牌除外），你可以将一张黑色非基本牌置于牌堆顶，视为使用此基本牌。",

  ["#huomo"] = "活墨：将一张黑色非基本牌置于牌堆顶，视为使用一张基本牌",

  ["$huomo1"] = "笔墨写春秋，挥毫退万敌！",
  ["$huomo2"] = "妙笔在手，研墨在心。",
}

huomo:addEffect("viewas", {
  pattern = ".|.|.|.|.|basic",
  prompt = "#huomo",
  interaction = function(self, player)
    local all_names = Fk:getAllCardNames("b")
    local names = player:getViewAsCardNames(huomo.name, all_names, nil, player:getTableMark("huomo-turn"))
    if #names == 0 then return end
    return UI.CardNameBox {choices = names, all_names = all_names}
  end,
  filter_pattern = {
    min_num = 0,
    max_num = 0,
    pattern = "",
    subcards = {}
  },
  card_filter = function (self, player, to_select, selected)
    local card = Fk:getCardById(to_select)
    return #selected == 0 and card.type ~= Card.TypeBasic and card.color == Card.Black
  end,
  view_as = function(self, player, cards)
    if not self.interaction.data or #cards ~= 1 then return end
    local card = Fk:cloneCard(self.interaction.data)
    card.skillName = huomo.name
    card:addFakeSubcards(cards)
    return card
  end,
  before_use = function (self, player, use)
    player.room:moveCards({
      ids = use.card.fake_subcards,
      from = player,
      toArea = Card.DrawPile,
      moveReason = fk.ReasonPut,
      skillName = huomo.name,
      proposer = player,
      moveVisible = true,
    })
  end,
  enabled_at_play = function(self, player)
    return not player:isNude()
  end,
  enabled_at_response = function(self, player, response)
    return not response and not player:isNude() and
      #player:getViewAsCardNames(huomo.name, Fk:getAllCardNames("b"), nil, player:getTableMark("huomo-turn"))
  end,
})

huomo:addAcquireEffect(function (self, player, is_start)
  if not is_start and player.room.current == player then
    local room = player.room
    local names = {}
    room.logic:getEventsOfScope(GameEvent.UseCard, 1, function (e)
      local use = e.data
      if use.from == player and use.card.type == Card.TypeBasic then
        table.insertIfNeed(names, use.card.trueName)
      end
    end, Player.HistoryTurn)
    if #names > 0 then
      room:setPlayerMark(player, "huomo-turn", names)
    end
  end
end)

huomo:addEffect(fk.AfterCardUseDeclared, {
  can_refresh = function(self, event, target, player, data)
    return target == player and player:hasSkill(huomo.name, true) and data.card.type == Card.TypeBasic
  end,
  on_refresh = function(self, event, target, player, data)
    player.room:addTableMark(player, "huomo-turn", data.card.trueName)
  end,
})

huomo:addAI(nil, "vs_skill")

return huomo
