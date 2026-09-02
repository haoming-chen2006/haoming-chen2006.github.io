local shelie = fk.CreateSkill {
  name = "shelie",
}

Fk:loadTranslationTable{
  ["shelie"] = "涉猎",
  [":shelie"] = "摸牌阶段，你可以改为亮出牌堆顶五张牌，获得不同花色的牌各一张。",

  ["#shelie-choose"] = "涉猎：获得不同花色的牌各一张",

  ["$shelie1"] = "什么都略懂一点，生活更多彩一些。",
  ["$shelie2"] = "略懂，略懂。",
}

Fk:addPoxiMethod{
  name = "shelie",
  card_filter = function(to_select, selected, data)
    if table.contains(data[2], to_select) then return true end
    local suit = Fk:getCardById(to_select).suit
    return table.every(data[2], function (id)
      return Fk:getCardById(id).suit ~= suit
    end)
  end,
  feasible = Util.TrueFunc,
}

shelie:addEffect(fk.EventPhaseStart, {
  anim_type = "drawcard",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(shelie.name) and player.phase == Player.Draw and not data.phase_end
  end,
  on_use = function(self, event, target, player, data)
    data.phase_end = true
    local room = player.room
    local cards = room:getNCards(5)
    room:turnOverCardsFromDrawPile(player, cards, shelie.name)
    local get = {}
    for _, id in ipairs(cards) do
      local suit = Fk:getCardById(id).suit
      if table.every(get, function (id2)
        return Fk:getCardById(id2).suit ~= suit
      end) then
        table.insert(get, id)
      end
    end
    get = room:askToArrangeCards(player, {
      skill_name = shelie.name,
      card_map = cards,
      prompt = "#shelie-choose",
      free_arrange = false,
      box_size = 0,
      max_limit = {5, 4},
      min_limit = {0, #get},
      poxi_type = "shelie",
      default_choice = {{}, get},
    })[2]
    if #get > 0 then
      room:obtainCard(player, get, true, fk.ReasonPrey, player, shelie.name)
    end
    room:cleanProcessingArea(cards)
  end,
})

shelie:addAI(Fk.Ltk.AI.newInvokeStrategy{
  think = Util.TrueFunc
})

return shelie
