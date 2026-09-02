local mouShensu = fk.CreateSkill({
  name = "mou__shensu",
})

Fk:loadTranslationTable {
  ["mou__shensu"] = "神速",
  [":mou__shensu"] = "回合开始时，你可以选择任意项：1.跳过判定阶段和摸牌阶段；2.跳过摸牌阶段和出牌阶段；3.跳过出牌阶段和弃牌阶段。"..
    "你每以此法选择一项，便视为使用一张无距离限制的任意一种【杀】（不可连续指定相同的目标）。"..
    "若你跳过了出牌阶段，对应的【杀】不可响应；若你选择跳过的阶段有所重复，你翻面。",

  ["#mou__shensu-invoke"] = "是否发动 神速，每选择一项便可使用一张无距离限制的【杀】",
  ["mou__shensu_choice1"] = "跳过判定阶段和摸牌阶段",
  ["mou__shensu_choice2"] = "跳过摸牌阶段和出牌阶段",
  ["mou__shensu_choice3"] = "跳过出牌阶段和弃牌阶段",
  ["#mou__shensu-slash"] = "神速：选择使用【杀】的目标角色%arg",
  ["mou__shensu_nojink"] = "（不可被响应）",
  ["mou__shensu_prohibit"] = "重复目标",

  ["$mou__shensu1"] = "兵贵出奇，先夺者胜！",
  ["$mou__shensu2"] = "诸将岂不闻兵贵神速乎？",
}

mouShensu:addEffect(fk.TurnStart, {
  anim_type = "offensive",
  can_trigger = function(self, event, target, player, data)
    return
        player == target and
        player:hasSkill(mouShensu.name) and
        (
          (player:canSkip(Player.Judge) and player:canSkip(Player.Draw)) or
          (player:canSkip(Player.Draw) and player:canSkip(Player.Play)) or
          (player:canSkip(Player.Play) and player:canSkip(Player.Discard))
        )
  end,
  on_cost = function(self, event, target, player, data)
    local choices = {}
    if player:canSkip(Player.Judge) and player:canSkip(Player.Draw) then
      table.insert(choices, "mou__shensu_choice1")
    end
    if player:canSkip(Player.Draw) and player:canSkip(Player.Play) then
      table.insert(choices, "mou__shensu_choice2")
    end
    if player:canSkip(Player.Play) and player:canSkip(Player.Discard) then
      table.insert(choices, "mou__shensu_choice3")
    end
    choices = player.room:askToChoices(
      player,
      {
        choices = choices,
        min_num = 1,
        max_num = 3,
        skill_name = mouShensu.name,
        cancelable = true,
        all_choices = { "mou__shensu_choice1", "mou__shensu_choice2", "mou__shensu_choice3" },
      }
    )
    if #choices > 0 then
      event:setCostData(self, { choice = choices })
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    ---@type string
    local skillName = mouShensu.name
    local choices = event:getCostData(self).choice
    local extra_data = {}
    if table.contains(choices, "mou__shensu_choice1") then
      table.insert(extra_data, false)
      player:skip(Player.Judge)
      player:skip(Player.Draw)
    end
    if table.contains(choices, "mou__shensu_choice2") then
      table.insert(extra_data, true)
      player:skip(Player.Draw)
      player:skip(Player.Play)
    end
    if table.contains(choices, "mou__shensu_choice3") then
      table.insert(extra_data, true)
      player:skip(Player.Play)
      player:skip(Player.Discard)
    end
    local room = player.room
    local tos = {}
    local slash_names = { "slash" }
    table.every(Fk:getAllCardNames("b", false), function(card)
      if not not string.find(card, "slash") then
        table.insertIfNeed(slash_names, card)
      end
      return true
    end)
    for _, nojink in ipairs(extra_data) do
      local ava_tos = {}
      for _, p in ipairs(room.alive_players) do
        if p ~= player and not table.contains(tos, p.id) then
          table.insert(ava_tos, p.id)
        end
      end
      if #ava_tos == 0 then break end
      local use = room:askToUseVirtualCard(player, {
        name = slash_names,
        skill_name = skillName,
        prompt = "#mou__shensu-slash:::" .. (nojink and "mou__shensu_nojink" or ""),
        cancelable = true,
        extra_data = {
          bypass_times = true,
          bypass_distances = true,
          exclusive_targets = ava_tos,
        },
        skip = true,
      })
      if use then
        tos = table.map(use.tos, Util.IdMapper)
        if nojink then
          use.disresponsiveList = room:getAlivePlayers(false)
        end
        room:useCard(use)
        if player.dead then break end
      else
        break
      end
    end
    if player:isAlive() and #choices > 1 and table.contains(choices, "mou__shensu_choice2") then
      player:turnOver()
    end
  end,
})

Fk:addTargetTip {
  name = "mou__shensu",
  target_tip = function(_, _, to_select, _, _, _, _, extra_data)
    if type(extra_data.extra_data) == "table" and table.contains(extra_data.extra_data, to_select) then
      return { { content = "mou__shensu_prohibit", type = "warning" } }
    end
  end,
}

return mouShensu
