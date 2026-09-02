local mouWushuang = fk.CreateSkill {
  name = "mou__wushuang",
  tags = { Skill.Compulsory },
}

Fk:loadTranslationTable{
  ["mou__wushuang"] = "无双",
  [":mou__wushuang"] = "锁定技，你使用的【杀】需两张【闪】才能抵消；与你进行【决斗】的角色每次需打出两张【杀】。" ..
  "每回合限一次，若对方没有使用或打出【杀】或【闪】，则此【杀】或【决斗】对其造成的伤害+1。",

  ["$mou__wushuang1"] = "小儿何往？与某再战一场！",
  ["$mou__wushuang2"] = "无双之力，岂是尔等可挡？",
  ["$mou__wushuang3"] = "哈哈哈哈，我这画戟滋味如何？",
  ["$mou__wushuang4"] = "哼，教汝摧身裂胆，魂飞魄荡。",
  ["$mou__wushuang5"] = "黄口竖子，何敢挑衅于我。",
  ["$mou__wushuang6"] = "这熟悉的力量，本该由我掌控。",
}

mouWushuang:addEffect(fk.DamageCaused, {
  mute = true,
  times = function(self, player)
    return 1 - player:usedEffectTimes(self.name)
  end,
  can_trigger = function(self, event, target, player, data)
    if
      not (
        target == player and
        player:hasSkill(mouWushuang.name) and
        data.card and
        table.contains({ "slash", "duel" }, data.card.trueName) and
        player:usedEffectTimes(self.name) == 0
      )
    then
      return false
    end

    local effectEvent = player.room.logic:getCurrentEvent():findParent(GameEvent.CardEffect)
    if effectEvent then
      local effectData = effectEvent.data
      if not table.contains((effectData.extra_data or {}).mouWushuangTargets or {}, data.to) then
        return false
      end

      if effectData.card.trueName == "slash" then
        return not table.find(effectData.cardsResponded or {},
          function(card) return card.trueName == "jink"
        end)
      elseif effectData.card.trueName == "duel" then
        return #player.room.logic:getEventsByRule(GameEvent.RespondCard, 1, function(e)
          local responseData = e.data
          return
            responseData.card.trueName == "slash" and
            responseData.responseToEvent == effectData and
            responseData.from == data.to
        end, nil, Player.HistoryTurn) == 0
      end
    end
  end,
  on_use = function(self, event, target, player, data)
    player.room:notifySkillInvoked(player, mouWushuang.name, "offensive")
    player:broadcastSkillInvoke(mouWushuang.name, math.random(3, 4))
    data:changeDamage(1)
  end,
})

---@type TrigSkelSpec<AimFunc>
local spec = {
  on_use = function(self, event, target, player, data)
    local to = (event == fk.TargetConfirmed and data.card.trueName == "duel") and data.from or data.to
    player.room:notifySkillInvoked(player, mouWushuang.name, "offensive")
    if data.card.trueName == "duel" and to:hasSkill("wushuang") then
      player:broadcastSkillInvoke(mouWushuang.name, math.random(5, 6))
    else
      player:broadcastSkillInvoke(mouWushuang.name, math.random(1, 2))
    end

    data:setResponseTimes(2, to)
    data.extra_data = data.extra_data or {}
    data.extra_data.mouWushuangTargets = data.extra_data.mouWushuangTargets or {}
    table.insertIfNeed(data.extra_data.mouWushuangTargets, to)
  end,
}

mouWushuang:addEffect(fk.TargetSpecified, {
  anim_type = "offensive",
  can_trigger = function(self, event, target, player, data)
    return
      target == player and
      player:hasSkill(mouWushuang.name) and
      table.contains({ "slash", "duel" }, data.card.trueName)
  end,
  on_use = spec.on_use,
})

mouWushuang:addEffect(fk.TargetConfirmed, {
  anim_type = "offensive",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(mouWushuang.name) and data.card.trueName == "duel"
  end,
  on_use = spec.on_use,
})

return mouWushuang
