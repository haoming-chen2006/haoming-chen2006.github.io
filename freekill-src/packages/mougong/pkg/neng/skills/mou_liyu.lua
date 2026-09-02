local mouLiyu = fk.CreateSkill {
  name = "mou__liyu",
}

Fk:loadTranslationTable{
  ["mou__liyu"] = "利驭",
  [":mou__liyu"] = "当你使用【杀】对其他角色造成伤害后，你可以获得其区域里至多等同于伤害数张牌，然后其摸等量张牌。" ..
  "若你与其共因此获得了全部类别的牌，其选择一项：1.令你视为对由其指定的另一名其他角色使用一张【决斗】；" ..
  "2.其获得技能<a href=':wushuang'>〖无双〗</a>直到其下个回合结束。",

  ["#mou__liyu-prey"] = "利驭：选择 %dest 的至多%arg张区域里的牌获得，然后其摸等量张牌（0牌确定则取消）",
  ["mou__liyu_duel"] = "令%src对由你选择的除其外的其他角色视为使用一张【决斗】",
  ["mou__liyu_wushuang"] = "获得“无双（标）”直到你下个回合结束",
  ["#mou__liyu-duel"] = "利驭：请选择 %src 要决斗的目标",

  ["$mou__liyu1"] = "无利不争，有利乃行。",
  ["$mou__liyu2"] = "某岂为此等小利所动。",
  ["$mou__liyu3"] = "今日，当与汝已决生死。",
  ["$mou__liyu4"] = "汝命价值千金，此事不得不行。",
  ["$mou__liyu5"] = "吾天下无敌，今日怎会如此？",
}

mouLiyu:addEffect(fk.Damage, {
  mute = true,
  can_trigger = function (self, event, target, player, data)
    return
      target == player and
      player:hasSkill(mouLiyu.name) and
      data.to ~= player and
      data.card and
      data.card.trueName == "slash" and
      not data.to:isAllNude() and
      data.to:isAlive()
  end,
  on_cost = function(self, event, target, player, data)
    local cards = player.room:askToChooseCards(
      player,
      {
        min = 0,
        max = data.damage,
        target = data.to,
        flag = "hej",
        prompt = "#mou__liyu-prey::" .. data.to.id .. ":" .. data.damage,
        skill_name = mouLiyu.name,
        cancelable = true,
      }
    )

    if #cards > 0 then
      event:setCostData(self, cards)
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    ---@type string
    local skillName = mouLiyu.name
    local room = player.room
    room:notifySkillInvoked(player, skillName, "offensive")
    player:broadcastSkillInvoke(skillName, math.random(1, 2))

    local cards = event:getCostData(self)
    room:obtainCard(player, cards, nil, fk.ReasonPrey, player, skillName)

    local victim = data.to
    if not victim:isAlive() then
      return false
    end

    local cardsDrawn = victim:drawCards(#cards, skillName)
    if not victim:isAlive() then
      return false
    end

    table.insertTable(cards, cardsDrawn)
    local types = {}
    for _, id in ipairs(cards) do
      table.insertIfNeed(types, Fk:getCardById(id).type)
      if #types > 2 then
        break
      end
    end

    if #types > 2 then
      local choices = { "mou__liyu_duel:" .. player.id, "mou__liyu_wushuang" }
      local duelTargets = {}
      local duel = Fk:cloneCard("duel")
      for _, p in ipairs(room:getOtherPlayers(victim, false)) do
        if p ~= player and player:canUseTo(duel, p) then
          table.insert(duelTargets, p)
        end
      end

      if #duelTargets == 0 then
        table.remove(choices, 1)
      end

      local choice = room:askToChoice(
        victim,
        {
          choices = choices,
          skill_name = skillName,
          all_choices = { "mou__liyu_duel:" .. player.id, "mou__liyu_wushuang" },
        }
      )

      if choice:startsWith("mou__liyu_duel") then
        player:broadcastSkillInvoke(skillName, math.random(3, 4))
        local tos = room:askToChoosePlayers(
          victim,
          {
            min_num = 1,
            max_num = 1,
            targets = duelTargets,
            skill_name = skillName,
            prompt = "#mou__liyu-duel:" .. player.id,
            cancelable = false,
          }
        )

        room:useCard{
          from = player,
          tos = tos,
          card = duel,
          extraUse = false,
        }
      elseif not victim:hasSkill("wushuang", true) then
        player:broadcastSkillInvoke(skillName, 5)
        room:setPlayerMark(victim, "mou__liyu_wushuang_record", 1)
        room:handleAddLoseSkills(victim, "wushuang")
      end
    end
  end,
})

local mouLiyuClearSpec = {
  is_delay_effect = true,
  mute = true,
  can_trigger = function(self, event, target, player, data)
    return target == player and player:getMark("mou__liyu_wushuang_record") ~= 0
  end,
  on_cost = Util.TrueFunc,
  on_use = function(self, event, target, player, data)
    local room = player.room
    room:setPlayerMark(player, "mou__liyu_wushuang_record", 0)
    room:handleAddLoseSkills(player, "-wushuang")
  end,
}

mouLiyu:addEffect(fk.TurnEnd, mouLiyuClearSpec)

mouLiyu:addEffect(fk.BuryVictim, mouLiyuClearSpec)

return mouLiyu
