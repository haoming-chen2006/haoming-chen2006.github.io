local shensu = fk.CreateSkill({
  name = "shensu",
})

Fk:loadTranslationTable{
  ["shensu"] = "神速",
  [":shensu"] = "你可以做出如下选择：1.跳过判定阶段和摸牌阶段；2.跳过出牌阶段并弃置一张装备牌。你每选择一项，便视为你使用一张无距离限制的【杀】。",

  ["#shensu1-choose"] = "神速：跳过判定阶段和摸牌阶段，视为使用无距离限制的【杀】",
  ["#shensu2-choose"] = "神速：跳过出牌阶段并弃一张装备牌，视为使用无距离限制的【杀】",

  ["$shensu1"] = "吾善于千里袭人！",
  ["$shensu2"] = "取汝首级，有如探囊取物！",
}

shensu:addEffect(fk.EventPhaseChanging, {
  anim_type = "offensive",
  can_trigger = function(self, event, target, player, data)
    if target == player and player:hasSkill(shensu.name) and not data.skipped then
      if data.phase == Player.Judge then
        if not player:canSkip(Player.Draw) then return end
      elseif data.phase == Player.Play then
        if player:isNude() then return end
      else
        return
      end
      return table.find(player.room:getOtherPlayers(player, false), function (p)
        return player:canUseTo(Fk:cloneCard("slash"), p, {bypass_distances = true, bypass_times = true})
      end)
    end
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local slash = Fk:cloneCard("slash")
    local max_num = slash.skill:getMaxTargetNum(player, slash)
    local targets = table.filter(room:getOtherPlayers(player, false), function (p)
      return player:canUseTo(slash, p, {bypass_distances = true, bypass_times = true})
    end)
    if data.phase == Player.Judge then
      local tos = room:askToChoosePlayers(player, {
        min_num = 1,
        max_num = max_num,
        targets = targets,
        skill_name = shensu.name,
        prompt = "#shensu1-choose",
        cancelable = true,
      })
      if #tos > 0 then
        room:sortByAction(tos)
        event:setCostData(self, { tos = tos })
        return true
      end
    elseif data.phase == Player.Play then
      local tos, cards = room:askToChooseCardsAndPlayers(player, {
        min_card_num = 1,
        max_card_num = 1,
        min_num = 1,
        max_num = max_num,
        targets = targets,
        pattern = ".|.|.|.|.|equip",
        skill_name = shensu.name,
        prompt = "#shensu2-choose",
        cancelable = true,
        will_throw = true,
      })
      if #tos > 0 and #cards > 0 then
        room:sortByAction(tos)
        event:setCostData(self, { tos = tos, cards = cards })
        return true
      end
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    if data.phase == Player.Judge then
      player:skip(Player.Draw)
    elseif data.phase == Player.Play then
      room:throwCard(event:getCostData(self).cards, shensu.name, player, player)
    end
    data.skipped = true
    if player.dead then return end
    local targets = event:getCostData(self).tos or {}
    room:useVirtualCard("slash", nil, player, targets, shensu.name, true)
  end,
})

shensu:addAI(Fk.Ltk.AI.newChoosePlayersStrategy{
  choose_players = function(self, ai)
    local player = ai.player
    local card = Fk:cloneCard("slash")
    card.skillName = shensu.name
    local max_num = card.skill:getMaxTargetNum(player, card)
    return ai:askToChoosePlayers({
      targets = ai:getEnabledTargets(),
      min_num = 0,
      max_num = max_num,
      skill_name = shensu.name,
      benefit_func = function (logic, p)
        logic:useCard({
          from = player,
          tos = { p },
          card = card,
          extraUse = true,
        })
      end,
      basic_benefit = -ai:getBenefitOfEvents(function(logic)
        logic:drawCards(ai.player, 2, "phase_draw")
      end),
    })
  end,
})

return shensu
