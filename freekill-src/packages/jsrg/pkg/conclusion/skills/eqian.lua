local eqian = fk.CreateSkill {
  name = "eqian",
}

Fk:loadTranslationTable{
  ["eqian"] = "遏前",
  [":eqian"] = "结束阶段，你可以<a href='premeditate_href'>“蓄谋”</a>任意次；当你使用【杀】或“蓄谋”牌指定其他角色为唯一目标后，"..
  "你可以令此牌不计入次数限制且获得目标一张牌，然后目标可以令你本回合计算与其的距离+2。",

  ["#eqian-put"] = "遏前：你可以“蓄谋”任意次，将一张手牌作为“蓄谋”牌扣置于判定区",
  ["#eqian-invoke"] = "遏前：你可以令此%arg不计次数，并获得 %dest 一张牌",
  ["#eqian-prey"] = "遏前：获得 %dest 一张牌",
  ["#eqian-distance"] = "遏前：是否令 %src 本回合与你距离+2？",
  ["@@eqian-turn"] = "遏前",
}

local U = require "packages.utility.utility"

eqian:addEffect(fk.EventPhaseStart, {
  anim_type = "control",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(eqian.name) and player.phase == Player.Finish and
      not player:isKongcheng() and not table.contains(player.sealedSlots, Player.JudgeSlot)
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local cards = room:askToCards(player, {
      min_num = 1,
      max_num = 1,
      include_equip = false,
      skill_name = eqian.name,
      cancelable = true,
      prompt = "#eqian-put",
    })
    if #cards > 0 then
      event:setCostData(self, {cards = cards})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    U.premeditate(player, event:getCostData(self).cards, eqian.name)
    while not player:isKongcheng() and not player.dead and not table.contains(player.sealedSlots, Player.JudgeSlot) do
      local cards = room:askToCards(player, {
        min_num = 1,
        max_num = 1,
        include_equip = false,
        skill_name = eqian.name,
        cancelable = true,
        prompt = "#eqian-put",
      })
      if #cards > 0 then
        U.premeditate(player, cards, eqian.name, player)
      else
        return
      end
    end
  end,
})

eqian:addEffect(fk.TargetSpecified, {
  anim_type = "offensive",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(eqian.name) and
      (data.card.trueName == "slash" or (data.extra_data and data.extra_data.premeditate)) and
      data:isOnlyTarget(data.to) and data.to ~= player
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    if room:askToSkillInvoke(player, {
      skill_name = eqian.name,
      prompt = "#eqian-invoke::"..data.to.id..":"..data.card:toLogString(),
    }) then
      event:setCostData(self, {tos = {data.to}})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    if not data.use.extraUse then
      data.use.extraUse = true
      player:addCardUseHistory(data.card.trueName, -1)
    end
    if not data.to.dead and not data.to:isNude() then
      local card = room:askToChooseCard(player, {
        target = data.to,
        flag = "he",
        skill_name = eqian.name,
        prompt = "#eqian-prey::"..data.to.id,
      })
      room:moveCardTo(card, Card.PlayerHand, player, fk.ReasonPrey, eqian.name, nil, false, player)
      if not data.to.dead and room:askToSkillInvoke(data.to, {
        skill_name = eqian.name,
        prompt = "#eqian-distance:"..player.id,
      }) then
        room:addTableMark(data.to, "@@eqian-turn", player.id)
      end
    end
  end,
})

eqian:addEffect("distance", {
  correct_func = function(self, from, to)
    return 2 * #table.filter(to:getTableMark("@@eqian-turn"), function (id)
      return id == from.id
    end)
  end,
})

return eqian
