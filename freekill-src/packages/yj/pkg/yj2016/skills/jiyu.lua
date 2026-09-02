local jiyu = fk.CreateSkill {
  name = "jiyu",
}

Fk:loadTranslationTable{
  ["jiyu"] = "讥谀",
  [":jiyu"] = "出牌阶段每名角色限一次，若你有可以使用的手牌，你可以令一名角色弃置一张手牌，然后本回合你不能使用与之相同花色的牌。"..
  "若其以此法弃置的牌为♠，其失去1点体力，你翻面。",

  ["#jiyu"] = "讥谀：令一名角色弃置一张手牌，若为♠，其失去1点体力，你翻面",
  ["#jiyu-discard"] = "讥谀：请弃置一张手牌，若为♠，你失去1点体力，%src 翻面",
  ["@jiyu-turn"] = "讥谀",

  ["$jiyu1"] = "陛下，此人不堪大用。",
  ["$jiyu2"] = "尔等玩忽职守，依诏降职处置。",
}

jiyu:addEffect("active", {
  anim_type = "control",
  prompt = "#jiyu",
  card_num = 0,
  target_num = 1,
  can_use = function(self, player)
    return table.find(player:getCardIds("h"), function(id)
      local card = Fk:getCardById(id)
      return player:canUse(card) and not player:prohibitUse(card)
    end)
  end,
  card_filter = Util.FalseFunc,
  target_filter = function(self, player, to_select, selected, selected_cards)
    return #selected == 0 and not table.contains(player:getTableMark("jiyu-phase"), to_select.id) and
      not to_select:isKongcheng()
  end,
  on_use = function(self, room, effect)
    local player = effect.from
    local target = effect.tos[1]
    room:addTableMark(player, "jiyu-phase", target.id)
    local card = room:askToDiscard(target, {
      min_num = 1,
      max_num = 1,
      include_equip = false,
      skill_name = jiyu.name,
      pattern = ".",
      prompt = "#jiyu-discard:"..player.id,
      cancelable = false,
      skip = true,
    })
    if #card == 0 then return end
    card = Fk:getCardById(card[1])
    room:throwCard(card, jiyu.name, target, target)
    if card.suit == Card.NoSuit then return end
    room:addTableMarkIfNeed(player, "@jiyu-turn", card:getSuitString(true))
    if card.suit == Card.Spade then
      if not target.dead then
        room:loseHp(target, 1, jiyu.name)
      end
      if not player.dead then
        player:turnOver()
      end
    end
  end,
})

jiyu:addEffect("prohibit", {
  prohibit_use = function(self, player, card)
    local suits = player:getTableMark("@jiyu-turn")
    if #suits > 0 then
      suits = table.map(suits, function (suit)
        return string.sub(suit, 5)
      end)
      --注意，此类技能不能写成“不能使用……”的逻辑，必须写成“只能使用……”
      return not card:matchVSPattern(".|.|^("..table.concat(suits, ",")..")")
    end
  end,
})

return jiyu
