local feijun = fk.CreateSkill {
  name = "feijun",
}

Fk:loadTranslationTable{
  ["feijun"] = "飞军",
  [":feijun"] = "出牌阶段限一次，你可以弃置一张牌，然后选择一项：1.令一名手牌数大于你的角色交给你一张牌；2.令一名装备区里牌数大于你的角色"..
  "弃置一张装备区里的牌。",

  ["#feijun"] = "飞军：弃置一张牌，令一名手牌数/装备数大于你的角色交给你一张牌/弃置一张装备",
  ["#feijun-choose"] = "飞军：选择一名手牌数或装备数大于你的角色执行效果",
  ["feijun1"] = "交给你一张牌",
  ["feijun2"] = "弃置一张装备区的牌",
  ["#feijun-choice"] = "飞军：选择令 %dest 执行的一项",
  ["#feijun-give"] = "飞军：你需交给 %src 一张牌",
  ["#feijun-discard"] = "飞军：弃置一张装备区里的牌",

  ["$feijun1"] = "无当飞军，伐叛乱，镇蛮夷！",
  ["$feijun2"] = "山地崎岖，也挡不住飞军破势！",
}

feijun:addEffect("active", {
  anim_type = "control",
  card_num = 1,
  target_num = 0,
  prompt = "#feijun",
  can_use = function (self, player)
    return player:usedSkillTimes(feijun.name, Player.HistoryPhase) == 0 and not player:isNude()
  end,
  card_filter = function(self, player, to_select, selected)
    return #selected == 0 and not player:prohibitDiscard(to_select)
  end,
  target_filter = Util.FalseFunc,
  on_use = function(self, room, effect)
    local player = effect.from
    room:throwCard(effect.cards, feijun.name, player, player)
    if player.dead then return end
    local targets = table.filter(room.alive_players, function(p)
      return p:getHandcardNum() > player:getHandcardNum()
    end)
    table.insertTableIfNeed(targets, table.filter(room.alive_players, function(p)
      return #p:getCardIds("e") > #player:getCardIds("e")
    end))
    if #targets == 0 then return end
    local to = room:askToChoosePlayers(player, {
      min_num = 1,
      max_num = 1,
      targets = targets,
      skill_name = feijun.name,
      prompt = "#feijun-choose",
      cancelable = false,
    })[1]

    effect.tos = { to }

    local choices = {}
    if to:getHandcardNum() > player:getHandcardNum() then
      table.insert(choices, "feijun1")
    end
    if #to:getCardIds("e") > #player:getCardIds("e") then
      table.insert(choices, "feijun2")
    end
    local choice = room:askToChoice(player, {
      choices = choices,
      skill_name = feijun.name,
      prompt = "#feijun-choice::"..to.id,
    })
    if choice == "feijun1" then
      local card = room:askToCards(to, {
        min_num = 1,
        max_num = 1,
        include_equip = true,
        skill_name = feijun.name,
        prompt = "#feijun-give:"..player.id,
        cancelable = false,
      })
      room:obtainCard(player, card, false, fk.ReasonGive, to, feijun.name)
    else
      room:askToDiscard(to, {
        min_num = 1,
        max_num = 1,
        include_equip = true,
        skill_name = feijun.name,
        cancelable = false,
        pattern = ".|.|.|equip",
        prompt = "#feijun-discard",
      })
    end
  end,
})

return feijun
