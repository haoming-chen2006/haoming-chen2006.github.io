local chengxiang = fk.CreateSkill {
  name = "chengxiang",
}

Fk:loadTranslationTable{
  ["chengxiang"] = "称象",
  [":chengxiang"] = "当你受到伤害后，你可以亮出牌堆顶四张牌，获得其中任意数量点数之和不大于13的牌，将其余牌置入弃牌堆。",

  ["#chengxiang-choose"] = "称象：获得任意点数之和不大于13的牌",

  ["$chengxiang1"] = "依我看，小事一桩。",
  ["$chengxiang2"] = "孰重孰轻，一称便知。",
}

Fk:addPoxiMethod{
  name = "chengxiang",
  card_filter = function(to_select, selected, data)
    if table.contains(data[2], to_select) then return true end
    local n = Fk:getCardById(to_select).number
    for _, id in ipairs(data[2]) do
      n = n + Fk:getCardById(id).number
    end
    return n < 14
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
      prompt = "#chengxiang-choose",
      box_size = 0,
      max_limit = {4, 4},
      min_limit = {0, 1},
      poxi_type = "chengxiang",
      default_choice = {{}, {cards[1]}}
    })[2]
    room:moveCardTo(get, Player.Hand, player, fk.ReasonJustMove, chengxiang.name, nil, true, player)
    room:cleanProcessingArea(cards)
  end,
})

return chengxiang
