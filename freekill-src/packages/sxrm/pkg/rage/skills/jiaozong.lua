local jiaozong = fk.CreateSkill {
  name = "sx__jiaozong",
}

Fk:loadTranslationTable {
  ["sx__jiaozong"] = "骄纵",
  [":sx__jiaozong"] = "准备阶段或当你成为【杀】的目标后，你可以移动场上一张装备牌至一名角色装备区内，其本回合不能使用与之颜色相同的牌且受到的伤害+1。",

  ["#sx__jiaozong-move"] = "骄纵：你可以移动场上一张装备，获得此牌的角色本回合不能使用同色牌且受到伤害+1",
  ["@sx__jiaozong_color-turn"] = "禁用",
  ["@sx__jiaozong-turn"] = "受到伤害+",
}

local spec = {
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local targets = room:askToChooseToMoveCardInBoard(player, {
      skill_name = jiaozong.name,
      prompt = "#sx__jiaozong-move",
      cancelable = true
    })
    if #targets > 0 then
      event:setCostData(self, { tos = targets })
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local targets = event:getCostData(self).tos
    local result = room:askToMoveCardInBoard(player, {
      skill_name = jiaozong.name,
      target_one = targets[1],
      target_two = targets[2],
      flag = "e",
    })
    if result == nil or result.to.dead then return end
    if result.card.color ~= Card.NoColor then
      room:addTableMarkIfNeed(result.to, "@sx__jiaozong_color-turn", result.card:getColorString())
    end
    room:addPlayerMark(result.to, "@sx__jiaozong-turn", 1)
  end,
}

jiaozong:addEffect(fk.EventPhaseStart, {
  anim_type = "control",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(jiaozong.name) and player.phase == Player.Start and
        #player.room:canMoveCardInBoard("e") > 0
  end,
  on_cost = spec.on_cost,
  on_use = spec.on_use,
})

jiaozong:addEffect(fk.TargetConfirmed, {
  anim_type = "control",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(jiaozong.name) and
        data.card.trueName == "slash" and #player.room:canMoveCardInBoard("e") > 0
  end,
  on_cost = spec.on_cost,
  on_use = spec.on_use,
})

jiaozong:addEffect(fk.DamageInflicted, {
  mute = true,
  is_delay_effect = true,
  can_trigger = function(self, event, target, player, data)
    return target == player and player:getMark("@sx__jiaozong-turn") > 0
  end,
  on_use = function(self, event, target, player, data)
    data:changeDamage(player:getMark("@sx__jiaozong-turn"))
  end,
})

jiaozong:addEffect("prohibit", {
  prohibit_use = function(self, player, card)
    return card and
        table.find(player:getTableMark("@sx__jiaozong_color-turn"), function(color)
          return card:getColorString() == color
        end)
  end,
})

return jiaozong
