local longlin = fk.CreateSkill {
  name = "longlin",
}

Fk:loadTranslationTable{
  ["longlin"] = "龙临",
  [":longlin"] = "当其他角色于其出牌阶段内首次使用【杀】指定目标后，你可以弃置一张牌令此【杀】无效，然后其可以视为对你使用一张【决斗】，"..
  "你以此法造成伤害后，其本阶段不能再使用手牌。",

  ["#longlin-invoke"] = "龙临：弃置一张牌，令 %dest 使用的%arg无效，然后其可以视为对你使用【决斗】 ",
  ["#longlin-duel"] = "龙临：是否视为对 %dest 使用【决斗】？",
  ["@@longlin-phase"] = "龙临 禁用手牌",

  ["$longlin1"] = "江山北望，熄天下烽火！",
  ["$longlin2"] = "龙吟震九州，翼展蔽日月！",
}

longlin:addEffect(fk.TargetSpecified, {
  anim_type = "control",
  can_trigger = function(self, event, target, player, data)
    if player:hasSkill(longlin.name) and target ~= player and target.phase == Player.Play and
      data.card.trueName == "slash" and data.firstTarget and not player:isNude() then
      local use_events = player.room.logic:getEventsOfScope(GameEvent.UseCard, 1, function (e)
        local use = e.data
        return use.card.trueName == "slash" and use.from == target
      end, Player.HistoryPhase)
      return #use_events == 1 and use_events[1].id == player.room.logic:getCurrentEvent().id
    end
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local card = room:askToDiscard(player, {
      min_num = 1,
      max_num = 1,
      include_equip = true,
      skill_name = longlin.name,
      cancelable = true,
      prompt = "#longlin-invoke::"..target.id..":"..data.card:toLogString(),
      skip = true
    })
    if #card > 0 then
      event:setCostData(self, {tos = {target}, cards = card})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    room:throwCard(event:getCostData(self).cards, longlin.name, player, player)
    data.use.nullifiedTargets = table.simpleClone(room.players)
    if player.dead or target.dead then return end
    if not target:isProhibited(player, Fk:cloneCard("duel")) and
      room:askToSkillInvoke(target, {
        skill_name = longlin.name,
        prompt = "#longlin-duel::"..player.id,
      }) then
      room:useVirtualCard("duel", nil, target, player, longlin.name, true)
    end
  end,
})

longlin:addEffect(fk.Damage, {
  can_refresh = function(self, event, target, player, data)
    if target == player and data.card and data.card.trueName == "duel" and
      table.contains(data.card.skillNames, longlin.name) and not data.to.dead then
      local e = player.room.logic:getCurrentEvent().parent
      while e do
        if e.event == GameEvent.SkillEffect then
          local dat = e.data
          if dat.skill.name == longlin.name and dat.who == player then
            return true
          end
        end
        e = e.parent
      end
    end
  end,
  on_refresh = function(self, event, target, player, data)
    player.room:setPlayerMark(data.to, "@@longlin-phase", 1)
  end,
})

longlin:addEffect("prohibit", {
  prohibit_use = function(self, player, card)
    if card and player:getMark("@@longlin-phase") > 0 then
      return table.find(Card:getIdList(card), function(id)
        return table.contains(player:getCardIds("h"), id)
      end)
    end
  end,
})

return longlin
