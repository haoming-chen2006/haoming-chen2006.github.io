local rangyi = fk.CreateSkill {
  name = "tw__rangyi"
}

Fk:loadTranslationTable{
  ["tw__rangyi"] = "攘夷",
  [":tw__rangyi"] = "出牌階段限一次，你可以將所有手牌交給一名其他角色，其選擇一項：1.使用其中一張牌，结算前交還給你其餘的牌；2.你對其造成1點傷害。",

  ["#tw__rangyi"] = "攘夷：将所有手牌交给一名角色，其使用其中一张牌或你对其造成1点伤害",
  ["#tw__rangyi-use"] = "攘夷：你需使用其中一张牌并交还给 %src 其余的牌，否则其对你造成1点伤害",
}

rangyi:addEffect("active", {
  anim_type = "control",
  prompt = "#tw__rangyi",
  card_num = 0,
  target_num = 1,
  can_use = function(self, player)
    return not player:isKongcheng() and player:usedSkillTimes(rangyi.name, Player.HistoryPhase) == 0
  end,
  card_filter = Util.FalseFunc,
  target_filter = function(self, player, to_select, selected)
    return #selected == 0 and to_select ~= player
  end,
  on_use = function(self, room, effect)
    local player = effect.from
    local target = effect.tos[1]
    local cards = table.simpleClone(player:getCardIds("h"))
    room:obtainCard(target, cards, false, fk.ReasonGive, player, rangyi.name)
    if target.dead then return end
    cards = table.filter(cards, function (id)
      return table.contains(target:getCardIds("h"), id)
    end)
    if #cards == 0 then return end
    local use = room:askToUseRealCard(target, {
      pattern = cards,
      skill_name = rangyi.name,
      prompt = "#tw__rangyi-use:"..player.id,
      extra_data = {
        bypass_times = true,
        extraUse = true,
      },
      skip = true,
    })
    if use then
      table.removeOne(cards, use.card:getEffectiveId())
      if #cards > 0 and not player.dead then
        room:obtainCard(player, cards, false, fk.ReasonGive, target, rangyi.name)
      end
      if table.contains(target:getCardIds("h"), use.card:getEffectiveId()) then
        room:useCard(use)
      end
    else
      room:damage{
        from = player,
        to = target,
        damage = 1,
        skillName = rangyi.name,
      }
    end
  end,
})

return rangyi
