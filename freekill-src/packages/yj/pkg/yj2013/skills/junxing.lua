local junxing = fk.CreateSkill {
  name = "junxing",
}

Fk:loadTranslationTable{
  ["junxing"] = "峻刑",
  [":junxing"] = "出牌阶段限一次，你可以弃置至少一张手牌，令一名其他角色选择一项：1.弃置一张与你弃置的牌类别均不同的手牌；"..
  "2.翻面并摸等同于你弃牌数的牌。",

  ["#junxing"] = "峻刑：弃置任意张手牌，令一名角色选择弃置一张不同类别的手牌或翻面并摸等量牌",
  ["#junxing-discard"] = "峻刑：你需弃置一张不同类别的手牌，否则翻面并摸弃牌数的牌",

  ["$junxing1"] = "严刑峻法，以破奸诡之胆。",
  ["$junxing2"] = "你招还是不招？",
}

junxing:addEffect("active", {
  anim_type = "control",
  prompt = "#junxing",
  min_card_num = 1,
  target_num = 1,
  can_use = function(self, player)
    return player:usedSkillTimes(junxing.name, Player.HistoryPhase) == 0 and not player:isKongcheng()
  end,
  card_filter = function(self, player, to_select, selected)
    return table.contains(player:getCardIds("h"), to_select) and not player:prohibitDiscard(to_select)
  end,
  target_filter = function(self, player, to_select, selected)
    return #selected == 0 and to_select ~= player
  end,
  on_use = function(self, room, effect)
    local player = effect.from
    local target = effect.tos[1]
    local types = {"basic", "trick", "equip"}
    for _, id in ipairs(effect.cards) do
      table.removeOne(types, Fk:getCardById(id):getTypeString())
    end
    room:throwCard(effect.cards, junxing.name, player, player)
    if target.dead then return end
    if #types == 0 or #room:askToDiscard(target, {
      skill_name = junxing.name,
      include_equip = false,
      min_num = 1,
      max_num = 1,
      pattern = ".|.|.|hand|.|" .. table.concat(types, ","),
      prompt = "#junxing-discard",
      cancelable = true,
    }) == 0 then
      target:turnOver()
      if not target.dead then
        target:drawCards(#effect.cards, junxing.name)
      end
    end
  end,
})

return junxing
