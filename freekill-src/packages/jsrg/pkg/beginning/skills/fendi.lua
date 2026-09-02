local fendi = fk.CreateSkill {
  name = "fendi",
}

Fk:loadTranslationTable{
  ["fendi"] = "分敌",
  [":fendi"] = "每回合限一次，当你使用【杀】指定唯一目标后，你可以展示其至少一张手牌，然后令其只能使用或打出此次展示的牌直到"..
  "此【杀】结算完毕。若如此做，当此【杀】对其造成伤害后，你获得其手牌区或弃牌堆里的这些牌。",

  ["#fendi-invoke"] = "分敌：展示 %dest 任意张手牌，其只能使用或打出这些牌，若对其造成伤害则你获得这些牌",
  ["@@fendi-inhand"] = "分敌",
}

fendi:addEffect(fk.TargetSpecified, {
  anim_type = "offensive",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(fendi.name) and data.card.trueName == "slash" and
      data:isOnlyTarget(data.to) and not data.to:isKongcheng() and
      player:usedSkillTimes(fendi.name, Player.HistoryTurn) == 0
  end,
  on_cost = function (self, event, target, player, data)
    local room = player.room
    if room:askToSkillInvoke(player, {
      skill_name = fendi.name,
      prompt = "#fendi-invoke::"..data.to.id,
    }) then
      event:setCostData(self, {tos = {data.to}})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local cards = room:askToChooseCards(player, {
      skill_name = fendi.name,
      target = data.to,
      min = 1,
      max = data.to:getHandcardNum(),
      flag = "h",
    })
    data.to:showCards(cards)
    if data.to.dead then return end
    cards = table.filter(cards, function (id)
      return table.contains(data.to:getCardIds("h"), id)
    end)
    if #cards == 0 then return end
    local use_event = room.logic:getCurrentEvent():findParent(GameEvent.UseCard)
    if use_event == nil then return end
    local banner = room:getBanner("fendi_record") or {}
    table.insert(banner, {use_event.id, data.to.id, cards})
    room:setBanner("fendi_record", banner)
    for _, id in ipairs(cards) do
      room:addCardMark(Fk:getCardById(id), "@@fendi-inhand", 1)
    end
  end,
})

fendi:addEffect(fk.CardUseFinished, {
  can_refresh = function(self, event, target, player, data)
    local room = player.room
    return target == player and room:getBanner("fendi_record") and
      table.find(room:getBanner("fendi_record"), function (info)
        return info[1] == room.logic:getCurrentEvent().id
      end)
  end,
  on_refresh = function(self, event, target, player, data)
    local room = player.room
    local record = room:getBanner("fendi_record")
    for i = 1, #record do
      if record[i][1] == room.logic:getCurrentEvent().id then
        table.remove(record, i)
        break
      end
    end
    room:setBanner("fendi_record", #record > 0 and record or nil)
  end,
})

fendi:addEffect(fk.Damage, {
  anim_type = "drawcard",
  is_delay_effect = true,
  can_trigger = function(self, event, target, player, data)
    if target == player and not player.dead and player.room.logic:damageByCardEffect() then
      local room = player.room
      local use_event = room.logic:getCurrentEvent():findParent(GameEvent.UseCard)
      if use_event == nil then return false end
      local record = room:getBanner("fendi_record")
      if record then
        for _, info in ipairs(record) do
          if info[1] == use_event.id and info[2] == data.to.id then
            local cards = table.filter(info[3], function (id)
              return table.contains(room.discard_pile, id) or table.contains(data.to:getCardIds("h"), id)
            end)
            if #cards > 0 then
              event:setCostData(self, {cards = cards})
              return true
            end
          end
        end
      end
    end
  end,
  on_cost = function (self, event, target, player, data)
    event:setCostData(self, {tos = {data.to}, cards = event:getCostData(self).cards})
    return true
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local cards = event:getCostData(self).cards
    room:moveCardTo(cards, Player.Hand, player, fk.ReasonPrey, fendi.name, nil, true, player)
  end,
})

fendi:addEffect("prohibit", {
  prohibit_use = function(self, player, card)
    local mark = Fk:currentRoom():getBanner("fendi_record")
    if mark and card then
      local cardList = card:isVirtual() and card.subcards or {card.id}
      return #cardList > 0 and
        table.find(mark, function (info)
          return info[2] == player.id and
            table.find(cardList, function (id)
              return not table.contains(info[3], id)
            end) ~= nil
        end)
    end
  end,
  prohibit_response = function(self, player, card)
    local mark = Fk:currentRoom():getBanner("fendi_record")
    if mark and card then
      local cardList = card:isVirtual() and card.subcards or {card.id}
      return #cardList > 0 and
        table.find(mark, function (info)
          return info[2] == player.id and
            table.find(cardList, function (id)
              return not table.contains(info[3], id)
            end) ~= nil
        end)
    end
  end,
})

return fendi
