local langmie = fk.CreateSkill {
  name = "langmie",
}

Fk:loadTranslationTable{
  ["langmie"] = "狼灭",
  [":langmie"] = "其他角色的结束阶段，你可以选择一项：<br>1.若其本回合使用过至少两张相同类型的牌，你可以弃置一张牌，摸两张牌；<br>"..
  "2.若其本回合造成过至少2点伤害，你可以弃置一张牌，对其造成1点伤害。",

  ["#langmie-invoke"] = "狼灭：你可以弃置一张牌，执行一项",

  ["$langmie1"] = "群狼四起，灭其一威众。",
  ["$langmie2"] = "贪狼强力，寡义而趋利。",
}

langmie:addEffect(fk.EventPhaseStart, {
  anim_type = "drawcard",
  can_trigger = function(self, event, target, player, data)
    if player:hasSkill(langmie.name) and target ~= player and target.phase == Player.Finish and not player:isNude() then
      local room = player.room
      local choices = {}
      local count = {0, 0, 0}
      room.logic:getEventsOfScope(GameEvent.UseCard, 999, function(e)
        local use = e.data
        if use.from == target then
          if use.card.type == Card.TypeBasic then
            count[1] = count[1] + 1
          elseif use.card.type == Card.TypeTrick then
            count[2] = count[2] + 1
          elseif use.card.type == Card.TypeEquip then
            count[3] = count[3] + 1
          end
        end
      end, Player.HistoryTurn)
      if table.find(count, function(i)
        return i > 1
      end) then
        table.insert(choices, 1)
      end
      if not target.dead then
        local n = 0
        room.logic:getActualDamageEvents(1, function(e)
          local damage = e.data
          if damage.from and target == damage.from then
            n = n + damage.damage
          end
        end, Player.HistoryTurn)
        if n > 1 then
          table.insert(choices, 2)
        end
      end
      if #choices > 0 then
        event:setCostData(self, {choices = choices})
        return true
      end
    end
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local choices = event:getCostData(self).choices
    local success, dat = room:askToUseActiveSkill(player, {
      skill_name = "langmie_active",
      prompt = "#langmie-invoke",
      extra_data = {
        choices = choices,
      }
    })
    if success and dat then
      event:setCostData(self, {tos = {target} , cards = dat.cards, choice = dat.interaction})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local choice = event:getCostData(self).choice
    room:throwCard(event:getCostData(self).cards, langmie.name, player, player)
    if choice == "langmie_draw" then
      if not player.dead then
        player:drawCards(2, langmie.name)
      end
    elseif not target.dead then
      room:damage{
        from = player,
        to = target,
        damage = 1,
        skillName = langmie.name,
      }
    end
  end,
})

return langmie
