local huozhong = fk.CreateSkill {
  name = "huozhong",
  attached_skill_name = "huozhong&",
}

Fk:loadTranslationTable{
  ["huozhong"] = "惑众",
  [":huozhong"] = "所有角色出牌阶段限一次，该角色可以将一张黑色非锦囊牌当【兵粮寸断】置于其判定区，然后令你摸两张牌。",

  ["#huozhong-invoke"] = "惑众：你可以将一张黑色非锦囊牌当【兵粮寸断】置于判定区，摸两张牌",
}

huozhong:addEffect("active", {
  anim_type = "drawcard",
  target_num = 0,
  card_num = 1,
  prompt = "#huozhong",
  can_use = function(self, player)
    return player:usedSkillTimes(huozhong.name, Player.HistoryPhase) == 0 and
      not player:hasDelayedTrick("supply_shortage") and
      not table.contains(player.sealedSlots, Player.JudgeSlot)
  end,
  card_filter = function(self, player, to_select, selected)
    return #selected == 0 and Fk:getCardById(to_select).type ~= Card.TypeTrick and Fk:getCardById(to_select).color == Card.Black
  end,
  on_use = function(self, room, effect)
    local player = effect.from
    local card = Fk:cloneCard("supply_shortage")
    card:addSubcards(effect.cards)
    player:addVirtualEquip(card)
    room:moveCardTo(card, Card.PlayerJudge, player, fk.ReasonPut, huozhong.name)
    if not player.dead then
      player:drawCards(2, huozhong.name)
    end
  end,
})

return huozhong
