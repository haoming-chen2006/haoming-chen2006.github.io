local mouFangzhu = fk.CreateSkill({
  name = "mou__fangzhu",
  dynamic_desc = function (self, player, lang)
    if Fk:currentRoom():isGameMode("1v2_mode") then
      return "mou__fangzhu_1v2"
    else
      return "mou__fangzhu_not_1v2"
    end
  end,
})

Fk:loadTranslationTable{
  ["mou__fangzhu"] = "放逐",
  [":mou__fangzhu"] = "出牌阶段限一次，若你有〖行殇〗，则你可以选择一名其他角色，并移去至少一枚“颂”标记令其执行对应操作：" ..
  "2枚，直到其下个回合结束，其不能使用除基本牌外的手牌；4枚，直到其下个回合结束，其不可响应除其外的角色使用的牌，" ..
  "6枚，直到其下个回合结束，其所有武将技能失效，或其不能使用除锦囊牌外的手牌；8枚，其翻面，或直到其下个回合结束，其不能使用除装备牌外的手牌"..
  "（若为斗地主，则令其他角色技能失效、只可使用装备牌及翻面的效果不可选择）。",

  [":mou__fangzhu_1v2"] = "出牌阶段限一次，若你有〖行殇〗，则你可以选择一名其他角色，并移去至少一枚“颂”标记令其执行对应操作：" ..
  "2枚，直到其下个回合结束，其不能使用除基本牌外的手牌；4枚，直到其下个回合结束，其不可响应除其外的角色使用的牌，" ..
  "6枚，直到其下个回合结束，其不能使用除锦囊牌外的手牌。",
  [":mou__fangzhu_not_1v2"] = "出牌阶段限一次，若你有〖行殇〗，则你可以选择一名其他角色，并移去至少一枚“颂”标记令其执行对应操作：" ..
  "2枚，直到其下个回合结束，其不能使用除基本牌外的手牌；4枚，直到其下个回合结束，其不可响应除其外的角色使用的牌，" ..
  "6枚，直到其下个回合结束，其所有武将技能失效，或其不能使用除锦囊牌外的手牌；8枚，其翻面，或直到其下个回合结束，其不能使用除装备牌外的手牌。",

  ["#mou__fangzhu"] = "放逐：你可选择一名角色，消耗一定数量的“颂”标记对其进行限制",
  ["#mou__fangzhu_prohibit"] = "放逐",
  ["@mou__fangzhu_limit"] = "放逐限",
  ["@@mou__fangzhu_skill_nullified"] = "放逐 技能失效",
  ["@@mou__fangzhu_disresponsable"] = "放逐 不可响应",
  ["mou__fangzhu_only_basic"] = "2枚：只可使用基本牌",
  ["mou__fangzhu_only_trick"] = "6枚：只可使用锦囊牌",
  ["mou__fangzhu_only_equip"] = "8枚：只可使用装备牌",
  ["mou__fangzhu_nullify_skill"] = "6枚：武将技能失效",
  ["mou__fangzhu_disresponsable"] = "4枚：不可响应他人牌",
  ["mou__fangzhu_turn_over"] = "8枚：翻面",

  ["$mou__fangzhu1"] = "战败而降，辱我国威，岂能轻饶！",
  ["$mou__fangzhu2"] = "此等过错，不杀已是承了朕恩。",
}

mouFangzhu:addEffect("active", {
  anim_type = "control",
  prompt = "#mou__fangzhu",
  card_num = 0,
  target_num = 1,
  interaction = function(self, player)
    local choiceList = {
      "mou__fangzhu_only_basic",
      "mou__fangzhu_only_trick",
      "mou__fangzhu_only_equip",
      "mou__fangzhu_nullify_skill",
      "mou__fangzhu_disresponsable",
      "mou__fangzhu_turn_over",
    }
    local choices = {"mou__fangzhu_only_basic"}
    local x = player:getMark("@mou__xingshang_song")
    if x > 3 then
      table.insert(choices, "mou__fangzhu_disresponsable")
      if x > 5 then
        table.insert(choices, "mou__fangzhu_only_trick")
        if not Fk:currentRoom():isGameMode("1v2_mode") then
          table.insert(choices, "mou__fangzhu_nullify_skill")
          if x > 7 then
            table.insert(choices, "mou__fangzhu_only_equip")
            table.insert(choices, "mou__fangzhu_turn_over")
          end
        end
      end
    end
    return UI.ComboBox { choices = choices, all_choices = choiceList }
  end,
  can_use = function(self, player)
    return
      player:usedEffectTimes(self.name, Player.HistoryPhase) == 0 and
      player:getMark("@mou__xingshang_song") > 1 and
      player:hasSkill("mou__xingshang", true)
  end,
  card_filter = Util.FalseFunc,
  target_filter = function(self, player, to_select, selected, selected_cards)
    return #selected == 0 and to_select ~= player
  end,
  on_use = function(self, room, effect)
    local player = effect.from
    local target = effect.tos[1]

    local choice = self.interaction.data
    if choice:startsWith("mou__fangzhu_only") then
      choice = choice:sub(-5)
      room:removePlayerMark(player, "@mou__xingshang_song", choice == "basic" and 2 or (choice == "trick" and 6 or 8))
      room:addTableMarkIfNeed(target, "@mou__fangzhu_limit", choice .. "_char")
    elseif choice == "mou__fangzhu_nullify_skill" then
      room:removePlayerMark(player, "@mou__xingshang_song", 6)
      room:setPlayerMark(target, "@@mou__fangzhu_skill_nullified", 1)
    elseif choice == "mou__fangzhu_disresponsable" then
      room:removePlayerMark(player, "@mou__xingshang_song", 4)
      room:setPlayerMark(target, "@@mou__fangzhu_disresponsable", 1)
    elseif choice == "mou__fangzhu_turn_over" then
      room:removePlayerMark(player, "@mou__xingshang_song", 8)
      target:turnOver()
    end
  end,
})

mouFangzhu:addEffect(fk.TurnEnd, {
  late_refresh = true,
  can_refresh = function(self, event, target, player, data)
    return
      target == player and
      table.find(
        { "@mou__fangzhu_limit", "@@mou__fangzhu_skill_nullified", "@@mou__fangzhu_disresponsable" },
        function(markName) return player:getMark(markName) ~= 0 end
      )
  end,
  on_refresh = function(self, event, target, player, data)
    local room = player.room
    for _, markName in ipairs({ "@mou__fangzhu_limit", "@@mou__fangzhu_skill_nullified", "@@mou__fangzhu_disresponsable" }) do
      if player:getMark(markName) ~= 0 then
        room:setPlayerMark(player, markName, 0)
      end
    end
  end,
})

mouFangzhu:addEffect(fk.CardUsing, {
  can_refresh = function(self, event, target, player, data)
    return target == player and table.find(player.room.alive_players, function(p)
      return p:getMark("@@mou__fangzhu_disresponsable") > 0 and p ~= target
    end)
  end,
  on_refresh = function(self, event, target, player, data)
    local room = player.room
    data.disresponsiveList = data.disresponsiveList or {}
    local tos = table.filter(room.alive_players, function(p)
      return p:getMark("@@mou__fangzhu_disresponsable") > 0 and p ~= target
    end)
    table.insertTableIfNeed(data.disresponsiveList, tos)
  end,
})

mouFangzhu:addEffect("prohibit", {
  prohibit_use = function(self, player, card)
    local typeLimited = player:getTableMark("@mou__fangzhu_limit")
    for _, type in ipairs(typeLimited) do
      if type ~= card:getTypeString() .. "_char" then
        local subcards = Card:getIdList(card)
        return
          #subcards > 0 and
          table.every(subcards, function(id)
            return table.contains(player:getCardIds("h"), id)
          end)
      end
    end
  end,
})

mouFangzhu:addEffect("invalidity", {
  invalidity_func = function(self, from, skill)
    return
      from:getMark("@@mou__fangzhu_skill_nullified") > 0 and skill:isPlayerSkill(from, true)
  end
})

return mouFangzhu
