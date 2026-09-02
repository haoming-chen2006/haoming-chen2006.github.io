local mieji = fk.CreateSkill {
  name = "mieji",
}

Fk:loadTranslationTable{
  ["mieji"] = "灭计",
  [":mieji"] = "出牌阶段限一次，你可以将一张黑色锦囊牌置于牌堆顶并选择一名其他角色，然后令该角色选择一项：1.弃置一张锦囊牌；2.依次弃置两张非锦囊牌。",

  ["#mieji"] = "灭计：将一张黑色锦囊牌置于牌堆顶，令一名角色选择弃一张锦囊牌或弃两张非锦囊牌",
  ["#mieji-discard1"] = "灭计：弃置一张锦囊牌或依次弃置两张非锦囊牌",
  ["#mieji-discard2"] = "灭计：再弃置一张非锦囊牌",

  ["$mieji1"] = "宁错杀，无放过！",
  ["$mieji2"] = "你能逃得出我的手掌心吗？",
}

mieji:addEffect("active", {
  anim_type = "offensive",
  prompt = "#mieji",
  card_num = 1,
  target_num = 1,
  can_use = function(self, player)
    return player:usedSkillTimes(mieji.name, Player.HistoryPhase) == 0
  end,
  card_filter = function(self, player, to_select, selected)
    local card = Fk:getCardById(to_select)
    return #selected == 0 and card.type == Card.TypeTrick and card.color == Card.Black
  end,
  target_filter = function(self, player, to_select, selected, selected_cards)
    return #selected == 0 and not to_select:isNude() and to_select ~= player
  end,
  on_use = function(self, room, effect)
    local player = effect.from
    local target = effect.tos[1]
    room:moveCards({
      ids = effect.cards,
      from = player,
      fromArea = Card.PlayerHand,
      toArea = Card.DrawPile,
      moveReason = fk.ReasonJustMove,
      skillName = mieji.name,
    })
    if target.dead then return end
    local card = room:askToDiscard(target, {
      min_num = 1,
      max_num = 1,
      include_equip = true,
      skill_name = mieji.name,
      cancelable = false,
      prompt = "#mieji-discard1"
    })
    if Fk:getCardById(card[1]).type ~= Card.TypeTrick and not target.dead then
      room:askToDiscard(target, {
        min_num = 1,
        max_num = 1,
        include_equip = true,
        skill_name = mieji.name,
        cancelable = false,
        pattern = ".|.|.|.|.|^trick",
        prompt = "#mieji-discard2",
      })
    end
  end,
})

return mieji
