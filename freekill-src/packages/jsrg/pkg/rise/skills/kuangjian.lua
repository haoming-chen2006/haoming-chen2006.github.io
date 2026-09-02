local kuangjian = fk.CreateSkill {
  name = "kuangjian",
}

Fk:loadTranslationTable{
  ["kuangjian"] = "匡谏",
  [":kuangjian"] = "你可以将装备牌当任意基本牌使用（目标不能为你且无次数限制），结算后目标角色使用弃牌堆中的此装备牌。",

  ["#kuangjian"] = "匡谏：将装备牌当任意基本牌使用（目标不能为你且无次数限制），结算后目标角色使用弃牌堆中此装备牌",
  ["#kuangjian-use"] = "匡谏：请使用%arg",
}

kuangjian:addEffect("viewas", {
  anim_type = "special",
  pattern = ".|.|.|.|.|basic",
  prompt = "#kuangjian",
  interaction = function(self, player)
    local all_names = Fk:getAllCardNames("b")

    local extraData = {}
    if
      ClientInstance and
      ClientInstance.current_request_handler and
      ClientInstance.current_request_handler.extra_data
    then
      extraData = ClientInstance.current_request_handler.extra_data
    end

    extraData.bypass_times = true

    local names = player:getViewAsCardNames(kuangjian.name, all_names, nil, nil, extraData)
    if #names > 0 then
      return UI.CardNameBox { choices = names, all_choices = all_names }
    end
  end,
  handly_pile = true,
  card_filter = function(self, player, to_select, selected)
    return #selected == 0 and Fk:getCardById(to_select).type == Card.TypeEquip
  end,
  before_use = function (self, player, use)
    use.extraUse = true
  end,
  view_as = function(self, player, cards)
    if #cards ~= 1 or self.interaction.data == nil then return end
    local card = Fk:cloneCard(self.interaction.data)
    card:addSubcard(cards[1])
    card.skillName = kuangjian.name
    return card
  end,
  after_use = function (self, player, use)
    local room = player.room
    if table.contains(room.discard_pile, use.card.subcards[1]) then
      local card = Fk:getCardById(use.card.subcards[1])
      if card.type ~= Card.TypeEquip then return end
      for _, p in ipairs(use.tos) do
        if not p.dead and p:canUse(card) then
          if p:canUseTo(card, p) then
            room:useCard({
              from = p,
              tos = {p},
              card = card,
            })
          else
            room:askToUseRealCard(p, {
              pattern = {card.id},
              skill_name = kuangjian.name,
              prompt = "#kuangjian-use:::"..card:toLogString(),
              extra_data = {
                expand_pile = {card.id},
              },
              cancelable = false,
            })
          end
        end
      end
    end
  end,
  enabled_at_response = function (self, player, response)
    return not response
  end,
})

kuangjian:addEffect("prohibit", {
  is_prohibited = function (self, from, to, card)
    return card and table.contains(card.skillNames, kuangjian.name) and from == to
  end,
})

kuangjian:addEffect("targetmod", {
  bypass_times = function(self, player, skill, scope, card)
    return card and table.contains(card.skillNames, kuangjian.name)
  end,
})

return kuangjian
