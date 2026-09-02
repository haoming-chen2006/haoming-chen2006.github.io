local xianzhu = fk.CreateSkill {
  name = "js__xianzhu",
  tags = { Skill.AttachedKingdom },
  attached_kingdom = {"wei"},
}

Fk:loadTranslationTable{
  ["js__xianzhu"] = "先著",
  [":js__xianzhu"] = "魏势力技，你可以将一张普通锦囊牌当无次数限制的【杀】使用，此【杀】对唯一目标造成伤害后，你视为对目标额外执行该锦囊牌的效果。",

  ["#js__xianzhu"] = "先著：你可以将一张普通锦囊牌当无次数限制的【杀】使用，若对唯一目标造成伤害，视为对其使用此锦囊",
}

xianzhu:addEffect("viewas", {
  anim_type = "offensive",
  pattern = "slash",
  prompt = "#js__xianzhu",
  handly_pile = true,
  card_filter = function(self, player, to_select, selected)
    return #selected == 0 and Fk:getCardById(to_select):isCommonTrick()
  end,
  view_as = function(self, player, cards)
    if #cards ~= 1 then return end
    local card = Fk:cloneCard("slash")
    card.skillName = xianzhu.name
    card:addSubcard(cards[1])
    return card
  end,
  enabled_at_response = function(self, player, response)
    return not response
  end,
})

xianzhu:addEffect("targetmod", {
  bypass_times = function(self, player, skill, scope, card)
    return card and scope == Player.HistoryPhase and table.contains(card.skillNames, xianzhu.name)
  end,
})

xianzhu:addEffect(fk.Damage, {
  anim_type = "control",
  is_delay_effect = true,
  can_trigger = function(self, event, target, player, data)
    if target == player and data.card and data.card.trueName == "slash" and table.contains(data.card.skillNames, xianzhu.name) and
      not player.dead and not data.to.dead then
      local card = Fk:getCardById(data.card.subcards[1])
      local to_use = Fk:cloneCard(card.name)
      if card:isCommonTrick() and not player:prohibitUse(to_use) and not player:isProhibited(data.to, to_use) and
        card.skill:modTargetFilter(player, data.to, {}, to_use, {bypass_distances = true, bypass_times = true}) then
        local room = player.room
        local e = room.logic:getCurrentEvent():findParent(GameEvent.UseCard)
        if e then
          local use = e.data
          return use:isOnlyTarget(data.to)
        end
      end
    end
  end,
  on_use = function(self, event, target, player, data)
    local name = Fk:getCardById(data.card.subcards[1]).name
    player.room:useVirtualCard(name, nil, player, data.to, xianzhu.name, true)
  end,
})

return xianzhu
