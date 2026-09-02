local kuangbi = fk.CreateSkill {
  name = "kuangbi",
}

Fk:loadTranslationTable{
  ["kuangbi"] = "匡弼",
  [":kuangbi"] = "出牌阶段限一次，你可以令一名其他角色将一至三张牌扣置于你的武将牌上。若如此做，你的下回合开始时，你获得武将牌上所有牌，"..
  "其摸等量的牌。",

  ["#kuangbi"] = "匡弼：令一名角色将至多三张牌置为“匡弼”牌，你下回合开始时获得“匡弼”牌，其摸等量牌",
  ["#kuangbi-ask"] = "匡弼：将至多三张牌置为 %src 的“匡弼”牌",
  ["$kuangbi"] = "匡弼",

  ["$kuangbi1"] = "匡人助己，辅政弼贤。",
  ["$kuangbi2"] = "兴隆大化，佐理时务。",
}

kuangbi:addEffect("active", {
  anim_type = "support",
  prompt = "#kuangbi",
  card_num = 0,
  target_num = 1,
  can_use = function(self, player)
    return player:usedEffectTimes(kuangbi.name, Player.HistoryPhase) == 0
  end,
  card_filter = Util.FalseFunc,
  target_filter = function(self, player, to_select, selected, selected_cards)
    return #selected == 0 and to_select ~= player and not to_select:isNude()
  end,
  on_use = function(self, room, effect)
    local player = effect.from
    local target = effect.tos[1]
    local cards = room:askToCards(target, {
      skill_name = kuangbi.name,
      include_equip = true,
      min_num = 1,
      max_num = 3,
      prompt = "#kuangbi-ask:"..player.id,
      cancelable = false,
    })
    room:setPlayerMark(player, kuangbi.name, target.id)
    player:addToPile("$kuangbi", cards, false, kuangbi.name, target)
  end,
})

kuangbi:addEffect(fk.TurnStart, {
  anim_type = "support",
  is_delay_effect = true,
  can_trigger = function(self, event, target, player, data)
    return target == player and player:getMark(kuangbi.name) ~= 0
  end,
  on_cost = function (self, event, target, player, data)
    event:setCostData(self, {tos = {player:getMark(kuangbi.name)}})
    return true
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local to = room:getPlayerById(player:getMark(kuangbi.name))
    room:setPlayerMark(player, kuangbi.name, 0)
    if #player:getPile("$kuangbi") > 0 then
      local cards = player:getPile("$kuangbi")
      room:obtainCard(player, cards, false, fk.ReasonJustMove, player, kuangbi.name)
      if not to.dead then
        to:drawCards(#cards, kuangbi.name)
      end
    end
  end,
})

return kuangbi
