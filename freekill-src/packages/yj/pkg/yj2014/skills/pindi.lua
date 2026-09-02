local pindi = fk.CreateSkill {
  name = "pindi",
}

Fk:loadTranslationTable{
  ["pindi"] = "品第",
  [":pindi"] = "出牌阶段，你可以弃置一张本回合未以此法弃置过的类别的牌并选择本回合未以此法选择过的一名其他角色，"..
  "令其摸或弃置X张牌（X为你于此回合内发动过此技能的次数）。若其已受伤，你横置。",

  ["#pindi"] = "品第：弃置一张牌，令一名其他角色摸牌或弃牌",
  ["pindi_draw"] = "摸%arg张牌",
  ["pindi_discard"] = "弃置%arg张牌",

  ["$pindi1"] = "观其风气，查其品行。",
  ["$pindi2"] = "推举贤才，兴盛大魏。",
}

pindi:addEffect("active", {
  anim_type = "control",
  prompt = "#pindi",
  interaction = function(self, player)
    local n = player:usedSkillTimes(pindi.name, Player.HistoryTurn) + 1
    return UI.ComboBox {choices = {"pindi_draw:::"..n, "pindi_discard:::"..n}}
  end,
  card_num = 1,
  target_num = 1,
  card_filter = function(self, player, to_select, selected)
    return #selected == 0 and not player:prohibitDiscard(to_select) and
      not table.contains(player:getTableMark("pindi_types-turn"), Fk:getCardById(to_select).type)
  end,
  target_filter = function(self, player, to_select, selected)
    if #selected == 0 and to_select ~= player and
      not table.contains(player:getTableMark("pindi_targets-turn"), to_select.id) then
      if self.interaction.data:startsWith("pindi_draw") then
        return true
      else
        return not to_select:isNude()
      end
    end
  end,
  on_use = function(self, room, effect)
    local player = effect.from
    local target = effect.tos[1]
    room:addTableMark(player, "pindi_types-turn", Fk:getCardById(effect.cards[1]).type)
    room:addTableMark(player, "pindi_targets-turn", target.id)
    room:throwCard(effect.cards, pindi.name, player, player)
    if target.dead then return end
    local n = player:usedSkillTimes(pindi.name, Player.HistoryTurn)
    if self.interaction.data:startsWith("pindi_draw") then
      target:drawCards(n, pindi.name)
    else
      room:askToDiscard(target, {
        min_num = n,
        max_num = n,
        include_equip = true,
        skill_name = pindi.name,
        cancelable = false,
      })
    end
    if not target.dead and target:isWounded() and not player.dead and not player.chained then
      player:setChainState(true)
    end
  end,
})

return pindi
