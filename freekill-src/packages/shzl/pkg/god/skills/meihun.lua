local meihun = fk.CreateSkill {
  name = "meihun",
}

Fk:loadTranslationTable{
  ["meihun"] = "魅魂",
  [":meihun"] = "结束阶段或当你成为【杀】目标后，你可以令一名其他角色交给你一张你声明的花色的牌，若其没有则你观看其手牌然后弃置其中一张。",

  ["#meihun-choose"] = "魅魂：你可以令一名角色交给你一张指定花色的牌",
  ["#meihun-give"] = "魅魂：请交给 %src 一张%arg牌",

  ["$meihun1"] = "将军还记得那晚的话么？弄疼人家，要赔不是哦~",
  ["$meihun2"] = "让我看看，将军这次会为我心软，还是耳根子软~",
  ["$meihun3"] = "眼前皆是身外物，将军所在，即吾心归处……",
  ["$meihun4"] = "既然你说我是魔鬼中的天使，那我就再任性一次~",
}

local spec = {
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local targets = table.filter(room:getOtherPlayers(player, false), function(p)
      return not p:isNude()
    end)
    local to = room:askToChoosePlayers(player, {
      min_num = 1,
      max_num = 1,
      targets = targets,
      skill_name = meihun.name,
      prompt = "#meihun-choose",
      cancelable = true,
    })
    if #to > 0 then
      event:setCostData(self, { tos = to })
      return true
    end
  end,
  on_use = function (self, event, target, player, data)
    local room = player.room
    local to = event:getCostData(self).tos[1]
    local choice = room:askToChoice(player, {
      choices = { "log_spade", "log_heart", "log_club", "log_diamond" },
      skill_name = meihun.name,
    })
    local cards = table.filter(to:getCardIds("he"), function(id)
      return Fk:getCardById(id):getSuitString(true) == choice
    end)

    if #cards > 0 then
      local card = room:askToCards(to, {
        min_num = 1,
        max_num = 1,
        include_equip = true,
        skill_name = meihun.name,
        pattern = tostring(Exppattern{ id = cards }),
        prompt = "#meihun-give:"..player.id.."::"..choice,
        cancelable = false,
      })
      room:obtainCard(player, card, false, fk.ReasonGive, to, meihun.name)
    elseif not to:isKongcheng() then
      local id = room:askToChooseCard(player, {
        target = to,
        flag = { card_data = {{ "$Hand", to:getCardIds("h") }} },
      })
      room:throwCard(id, meihun.name, to, player)
    end
  end,
}

meihun:addEffect(fk.EventPhaseStart, {
  anim_type = "control",
  audio_index = { 3, 4 },
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(meihun.name) and player.phase == Player.Finish and
      table.find(player.room:getOtherPlayers(player, false), function(p)
        return not p:isNude()
      end)
  end,
  on_cost = spec.on_cost,
  on_use = spec.on_use,
})

meihun:addEffect(fk.TargetConfirmed, {
  anim_type = "control",
  audio_index = { 1, 2 },
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(meihun.name) and data.card.trueName == "slash" and
      table.find(player.room:getOtherPlayers(player, false), function(p)
        return not p:isNude()
      end)
  end,
  on_cost = spec.on_cost,
  on_use = spec.on_use,
})

meihun:addAI(Fk.Ltk.AI.newChoosePlayersStrategy{
  choose_players = function(self, ai)
    return ai:askToChoosePlayers({
      targets = ai:getEnabledTargets(),
      min_num = 0,
      max_num = 1,
      skill_name = meihun.name,
      benefit_func = function (logic, p)
        logic:obtainCard(ai.player, table.random(p:getCardIds("he")), false, fk.ReasonGive, p, meihun.name)
      end,
    })
  end,
})

return meihun
