local chengxiang = fk.CreateSkill {
  name = "nos__chengxiang",
}

Fk:loadTranslationTable{
  ["nos__chengxiang"] = "称象",
  [":nos__chengxiang"] = "当你受到伤害后，你可以亮出牌堆顶的四张牌，然后获得其中任意数量点数之和小于13的牌。",

  ["#nos__chengxiang-choose"] = "称象：获得任意点数之和小于13的牌",

  ["$nos__chengxiang1"] = "以船载象，以石易象，称石则可得象斤重。",
  ["$nos__chengxiang2"] = "若以冲所言行事，则此象之重可称也。",
}

Fk:addPoxiMethod{
  name = "nos__chengxiang",
  card_filter = function(to_select, selected, data)
    if table.contains(data[2], to_select) then return true end
    local n = Fk:getCardById(to_select).number
    for _, id in ipairs(data[2]) do
      n = n + Fk:getCardById(id).number
    end
    return n < 13
  end,
  feasible = Util.TrueFunc,
}

chengxiang:addEffect(fk.Damaged, {
  anim_type = "masochism",
  on_use = function(self, event, target, player, data)
    local room = player.room
    local cards = room:getNCards(4)
    room:turnOverCardsFromDrawPile(player, cards, chengxiang.name)
    local get = room:askToArrangeCards(player, {
      skill_name = chengxiang.name,
      card_map = {cards},
      prompt = "#nos__chengxiang-choose",
      box_size = 0,
      max_limit = {4, 4},
      min_limit = {0, 1},
      poxi_type = "nos__chengxiang",
      default_choice = {{}, {table.find(cards, function (id)
        return Fk:getCardById(id).number < 13
      end)}}
    })[2]
    if #get > 0 then
      room:moveCardTo(get, Player.Hand, player, fk.ReasonJustMove, chengxiang.name, nil, true, player)
    end
    room:cleanProcessingArea(cards)
  end,
})

return chengxiang
