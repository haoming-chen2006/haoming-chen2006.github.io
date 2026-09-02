
local chuli = fk.CreateSkill{
  name = "ex__chuli",
}

Fk:loadTranslationTable{
  ["ex__chuli"] = "除疠",
  [":ex__chuli"] = "出牌阶段限一次，你可以选择任意名势力各不相同的其他角色，然后你弃置你和这些角色的各一张牌。被弃置♠牌的角色各摸一张牌。",

  ["#ex__chuli"] = "除疠：选择任意名势力不同的角色，弃置你和这些角色各一张牌，被弃置♠牌的角色摸一张牌",
  ["#ex__chuli-discard"] = "除疠：弃置 %dest 一张牌",

  ["$ex__chuli1"] = "病去，如抽丝。",
  ["$ex__chuli2"] = "病入膏肓，需下猛药。",
}

chuli:addEffect("active", {
  anim_type = "control",
  card_num = 0,
  min_target_num = 1,
  prompt = "#ex__chuli",
  can_use = function(self, player)
    return player:usedSkillTimes(chuli.name, Player.HistoryPhase) == 0 and not player:isNude()
  end,
  card_filter = Util.FalseFunc,
  target_filter = function(self, player, to_select, selected, selected_cards)
    return to_select ~= player and not to_select:isNude() and
      table.every(selected, function(p)
        return p.kingdom ~= to_select.kingdom
      end)
  end,
  on_use = function(self, room, effect)
    local player = effect.from
    room:sortByAction(effect.tos)
    table.insert(effect.tos, 1, effect.from)
    local draw = {}
    for _, target in ipairs(effect.tos) do
      if player.dead then break end
      if not target:isNude() then
        local cards = {}
        if target == player then
          cards = room:askToDiscard(player, {
            min_num = 1,
            max_num = 1,
            include_equip = true,
            skill_name = chuli.name,
            cancelable = false,
            skip = true,
          })
        else
          local card = room:askToChooseCard(player, {
            target = target,
            flag = "he",
            skill_name = chuli.name,
            prompt = "#ex__chuli-discard::"..target.id,
          })
          cards = {card}
        end
        if #cards > 0 then
          room:throwCard(cards, chuli.name, target, player)
          if Fk:getCardById(cards[1]).suit == Card.Spade then
            table.insert(draw, target)
          end
        end
      end
    end
    for _, p in ipairs(draw) do
      if not p.dead then
        p:drawCards(1, chuli.name)
      end
    end
  end,
})

return chuli
