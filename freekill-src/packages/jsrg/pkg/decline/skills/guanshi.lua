local guanshi = fk.CreateSkill {
  name = "guanshi",
}

Fk:loadTranslationTable{
  ["guanshi"] = "观势",
  [":guanshi"] = "出牌阶段限一次，你可以将【杀】当【火攻】对任意名角色使用，当此牌未对其中一名角色造成伤害时，"..
  "此牌对剩余角色视为【决斗】结算。",

  ["#guanshi"] = "观势：将【杀】当【火攻】对任意名角色使用，若未对一名角色造成伤害，对剩余角色改为【决斗】",
}

guanshi:addEffect("viewas", {
  anim_type = "offensive",
  prompt = "#guanshi",
  handly_pile = true,
  card_filter = function (self, player, to_select, selected)
    return #selected == 0 and Fk:getCardById(to_select).trueName == "slash"
  end,
  view_as = function (self, player, cards)
    if #cards ~= 1 then return end
    local card = Fk:cloneCard("fire_attack")
    card.skillName = guanshi.name
    card:addSubcards(cards)
    return card
  end,
  enabled_at_play = function (self, player)
    return player:usedSkillTimes(guanshi.name, Player.HistoryPhase) == 0
  end,
})

guanshi:addEffect("targetmod", {
  extra_target_func = function (self, player, skill, card)
    if card and table.contains(card.skillNames, guanshi.name) then
      return 999
    end
  end,
})

guanshi:addEffect(fk.PreCardEffect, {
  can_refresh = function(self, event, target, player, data)
    if data.from == player and table.contains(data.card.skillNames, guanshi.name) then
      local use_event = player.room.logic:getCurrentEvent():findParent(GameEvent.UseCard)
      if use_event then
        local use = use_event.data
        return #use_event:searchEvents(GameEvent.CardEffect, 1, function (e)
          if e.id < player.room.logic:getCurrentEvent().id then
            if not (use.damageDealt and use.damageDealt[e.data.to]) then
              return true
            end
          end
        end) > 0
      end
    end
  end,
  on_refresh = function(self, event, target, player, data)
    data:changeCardSkill("duel_skill")
  end,
})

return guanshi
