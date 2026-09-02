local mouHuoshou = fk.CreateSkill({
  name = "mou__huoshou",
  tags = { Skill.Compulsory },
})

Fk:loadTranslationTable{
  ["mou__huoshou"] = "祸首",
  [":mou__huoshou"] = "锁定技，①【南蛮入侵】对你无效；"..
  "<br>②当其他角色使用【南蛮入侵】指定目标后，你代替其成为此牌造成的伤害的来源；"..
  "<br>③出牌阶段开始时，你随机获得弃牌堆中的一张【南蛮入侵】；"..
  "<br>④当你于出牌阶段使用【南蛮入侵】后，此阶段内你不能再使用【南蛮入侵】。",

  ["$mou__huoshou1"] = "我才是南中之主！",
  ["$mou__huoshou2"] = "整个南中都要听我的！",
}

mouHuoshou:addEffect(fk.PreCardEffect, {
  anim_type = "defensive",
  can_trigger = function(self, event, target, player, data)
    return player == data.to and player:hasSkill(mouHuoshou.name) and data.card.trueName == "savage_assault"
  end,
  on_use = function(self, event, target, player, data)
    data.nullified = true
  end,
})

mouHuoshou:addEffect(fk.TargetSpecified, {
  anim_type = "negative",
  can_trigger = function(self, event, target, player, data)
    return target ~= player and data.firstTarget and player:hasSkill(mouHuoshou.name) and data.card.trueName == "savage_assault"
  end,
  on_use = function(self, event, target, player, data)
    data.extra_data = data.extra_data or {}
    data.extra_data.mou__huoshou = player.id
  end,
})

mouHuoshou:addEffect(fk.EventPhaseStart, {
  anim_type = "drawcard",
  can_trigger = function(self, event, target, player, data)
    if not (player == target and player:hasSkill(mouHuoshou.name) and player.phase == Player.Play) then
      return false
    end

    local ids = player.room:getCardsFromPileByRule("savage_assault", 1, "discardPile")
    if #ids > 0 then
      event:setCostData(self, ids[1])
      return true
    end

    return false
  end,
  on_use = function(self, event, target, player, data)
    player.room:obtainCard(player, event:getCostData(self), true, fk.ReasonPrey)
  end,
})

mouHuoshou:addEffect(fk.AfterCardUseDeclared, {
  anim_type = "negative",
  can_trigger = function(self, event, target, player, data)
    return player == target and player:hasSkill(mouHuoshou.name) and player.phase == Player.Play and data.card.name == "savage_assault"
  end,
  on_use = function(self, event, target, player, data)
    player.room:setPlayerMark(player, "mou__huoshou-phase", 1)
  end,
})

mouHuoshou:addEffect(fk.PreDamage, {
  can_refresh = function(self, event, target, player, data)
    if data.card and data.card.trueName == "savage_assault" then
      local e = player.room.logic:getCurrentEvent():findParent(GameEvent.UseCard)
      if e then
        local use = e.data
        return use.extra_data and use.extra_data.mou__huoshou
      end
    end
  end,
  on_refresh = function(self, event, target, player, data)
    local room = player.room
    local e = room.logic:getCurrentEvent():findParent(GameEvent.UseCard)
    if e then
      local use = e.data
      data.from = room:getPlayerById(use.extra_data.mou__huoshou)
    end
  end,
})

mouHuoshou:addEffect("prohibit", {
  prohibit_use = function(self, player, card)
    return player:getMark("mou__huoshou-phase") > 0 and card.trueName == "savage_assault"
  end,
})

return mouHuoshou
