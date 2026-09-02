local jinmie = fk.CreateSkill {
  name = "jinmie",
  tags = { Skill.AttachedKingdom },
  attached_kingdom = {"wei"},
}

Fk:loadTranslationTable{
  ["jinmie"] = "烬灭",
  [":jinmie"] = "魏势力技，出牌阶段限一次，你可以选择一名手牌数大于你的角色，视为对其使用一张无距离和次数限制的火【杀】。此牌造成伤害后，"..
  "你将其手牌弃置至与你相同。",

  ["#jinmie"] = "烬灭：视为对一名手牌数大于你的角色使用火【杀】，若造成伤害则弃置其手牌",
  ["#jinmie-discard"] = "烬灭：弃置 %dest %arg张手牌",
}

jinmie:addEffect("active", {
  anim_type = "offensive",
  prompt = "#jinmie",
  card_num = 0,
  target_num = 1,
  can_use = function(self, player)
    return player:usedSkillTimes(jinmie.name, Player.HistoryPhase) == 0
  end,
  card_filter = Util.FalseFunc,
  target_filter = function(self, player, to_select, selected)
    return #selected == 0 and to_select:getHandcardNum() > player:getHandcardNum() and
      not player:isProhibited(to_select, Fk:cloneCard("fire__slash"))
  end,
  on_use = function(self, room, effect)
    local player = effect.from
    local target = effect.tos[1]
    local card = Fk:cloneCard("fire__slash")
    card.skillName = jinmie.name
    local use = {
      from = player,
      tos = {target},
      card = card,
      extra_data = {
        jinmie_from = player,
        jinmie_to = target,
      },
    }
    room:useCard(use)
  end,
})

jinmie:addEffect(fk.Damage, {
  anim_type = "offensive",
  is_delay_effect = true,
  can_trigger = function (self, event, target, player, data)
    if data.card and table.contains(data.card.skillNames, jinmie.name) then
      local use_event = player.room.logic:getCurrentEvent():findParent(GameEvent.UseCard)
      if use_event then
        local use = use_event.data
        return use.extra_data and use.extra_data.jinmie_from == player and use.extra_data.jinmie_to == data.to and
          not player.dead and not data.to.dead and data.to:getHandcardNum() > player:getHandcardNum()
      end
    end
  end,
  on_cost = function (self, event, target, player, data)
    event:setCostData(self, {tos = {data.to}})
    return true
  end,
  on_use = function (self, event, target, player, data)
    local room = player.room
    local n = data.to:getHandcardNum() - player:getHandcardNum()
    local cards = room:askToChooseCards(player, {
      target = data.to,
      min = n,
      max = n,
      flag = "h",
      skill_name = jinmie.name,
      prompt = "#jinmie-discard::"..data.to.id..":"..n,
    })
    room:throwCard(cards, jinmie.name, data.to, player)
  end,
})

return jinmie
