local taoxi = fk.CreateSkill {
  name = "nos__taoxi",
}

Fk:loadTranslationTable{
  ["nos__taoxi"] = "讨袭",
  [":nos__taoxi"] = "你的出牌阶段内限一次，当你使用牌仅指定一名其他角色为目标后，你可以亮出其一张手牌直到回合结束，并且你可以于此回合内"..
  "将此牌如手牌般使用或打出。回合结束时，若该角色未失去此手牌，则你失去1点体力。",

  ["#nos__taoxi-invoke"] = "讨袭：你可以亮出 %dest 一张手牌，本回合你可以使用或打出此牌",
  ["#nos__taoxi-choose"] = "讨袭：亮出 %dest 一张手牌",
  ["@@nos__taoxi-inhand-turn"] = "讨袭",

  ["$nos__taoxi1"] = "策马疾如电，溃敌一瞬间。",
  ["$nos__taoxi2"] = "虎豹骑岂能徒有虚名？杀！",
}

taoxi:addEffect(fk.TargetSpecified, {
  anim_type = "offensive",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(taoxi.name) and player.phase == Player.Play and
      data.to ~= player and data:isOnlyTarget(data.to) and
      not data.to:isKongcheng() and
      player:usedSkillTimes(taoxi.name, Player.HistoryPhase) == 0
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    if room:askToSkillInvoke(player, {
      skill_name = taoxi.name,
      prompt = "#nos__taoxi-invoke::"..data.to.id,
    }) then
      event:setCostData(self, {tos = {data.to}})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local card = room:askToChooseCard(player, {
      target = data.to,
      flag = "h",
      skill_name = taoxi.name,
      prompt = "#nos__taoxi-choose::"..data.to.id
    })
    room:setCardMark(Fk:getCardById(card), "@@nos__taoxi-inhand-turn", 1)
  end,
})

taoxi:addEffect(fk.TurnEnd, {
  anim_type = "negative",
  is_delay_effect = true,
  can_trigger = function(self, event, target, player, data)
    return target == player and player:usedSkillTimes(taoxi.name, Player.HistoryTurn) > 0 and not player.dead and
      table.find(player.room:getOtherPlayers(player, false), function (p)
        return table.find(p:getCardIds("h"), function (id)
          return Fk:getCardById(id):getMark("@@nos__taoxi-inhand-turn") > 0
        end) ~= nil
      end)
  end,
  on_use = function(self, event, target, player, data)
    player.room:loseHp(player, 1, taoxi.name)
  end,
})

taoxi:addEffect("filter", {
  handly_cards = function (self, player)
    if player:usedSkillTimes(taoxi.name, Player.HistoryTurn) > 0 then
      local ids = {}
      for _, p in ipairs(Fk:currentRoom().alive_players) do
        for _, id in ipairs(p:getCardIds("h")) do
          if Fk:getCardById(id):getMark("@@nos__taoxi-inhand-turn") > 0 then
            table.insertIfNeed(ids, id)
          end
        end
      end
      return ids
    end
  end,
})

taoxi:addEffect("visibility", {
  card_visible = function (self, player, card)
    if card:getMark("@@nos__taoxi-inhand-turn") > 0 then
      return true
    end
  end,
})

return taoxi
