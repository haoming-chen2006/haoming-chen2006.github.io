local mouHuoji = fk.CreateSkill({
  name = "mou__huoji",
  tags = { Skill.Quest },
})

Fk:loadTranslationTable{
  ["mou__huoji"] = "火计",
  [":mou__huoji"] = "使命技，出牌阶段限一次，你可以选择一名其他角色，对其及其同势力的其他角色各造成1点火焰伤害。<br>\
  ⬤　成功：准备阶段，若你本局游戏对其他角色造成过至少X点火焰伤害（X为本局游戏人数），你失去〖火计〗〖看破〗，获得〖观星〗〖空城〗。<br>\
  ⬤　失败：当你进入濒死状态时，使命失败。",

  ["#mou__huoji"] = "发动 火计，选择一名角色，对所有与其势力相同的其他角色造成1点火焰伤害",
  ["@mou__huoji"] = "火计",

  ["$mou__huoji1"] = "区区汉贼，怎挡天火之威？",
  ["$mou__huoji2"] = "就让此火，再兴炎汉国祚。",
  ["$mou__huoji3"] = "吾虽有功，然终逆天命啊。",
}

mouHuoji:addEffect("active", {
  anim_type = "offensive",
  prompt = "#mou__huoji",
  card_num = 0,
  target_num = 1,
  mute = true,
  can_use = function(self, player)
    return player:usedEffectTimes(self.name, Player.HistoryPhase) == 0
  end,
  card_filter = Util.FalseFunc,
  target_filter = function(self, player, to_select, selected)
    return #selected == 0 and to_select ~= player
  end,
  on_use = function(self, room, effect)
    ---@type string
    local skillName = mouHuoji.name
    local player = effect.from
    local target = effect.tos[1]
    room:notifySkillInvoked(player, skillName)
    player:broadcastSkillInvoke(skillName, math.random(2))

    room:damage{
      from = player,
      to = target,
      damage = 1,
      damageType = fk.FireDamage,
      skillName = skillName,
    }
    local targets = {}
    for _, p in ipairs(room:getAlivePlayers()) do
      if p ~= player and p ~= target and p.kingdom == target.kingdom then
        table.insert(targets, p)
      end
    end
    for _, p in ipairs(targets) do
      if not p.dead then
        room:damage{
          from = player,
          to = p,
          damage = 1,
          damageType = fk.FireDamage,
          skillName = skillName,
        }
      end
    end
  end,
})

mouHuoji:addEffect(fk.EventPhaseStart, {
  mute = true,
  can_trigger = function(self, event, target, player, data)
    return
      target == player and
      player:hasSkill(mouHuoji.name) and
      not player:getQuestSkillState(mouHuoji.name) and
      player.phase == Player.Start and
      player:getMark("@mou__huoji") >= #player.room.players
  end,
  on_cost = Util.TrueFunc,
  on_use = function(self, event, target, player, data)
    ---@type string
    local skillName = mouHuoji.name
    local room = player.room
    player:broadcastSkillInvoke(skillName, math.random(2))
    room:notifySkillInvoked(player, skillName, "special")
    room:updateQuestSkillState(player, skillName, false)
    room:handleAddLoseSkills(player, "-mou__huoji|-mou__kanpo|mou__guanxing|mou__kongcheng", nil, true, false)
    if player.general == "mou__wolong" then
      player.general = "mou__zhugeliang"
      room:broadcastProperty(player, "general")
    else
      player.deputyGeneral = "mou__zhugeliang"
      room:broadcastProperty(player, "deputyGeneral")
    end
    room:invalidateSkill(player, skillName)
  end,
})

mouHuoji:addEffect(fk.EnterDying, {
  mute = true,
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(mouHuoji.name) and not player:getQuestSkillState(mouHuoji.name)
  end,
  on_cost = Util.TrueFunc,
  on_use = function(self, event, target, player, data)
    ---@type string
    local skillName = mouHuoji.name
    local room = player.room
    player:broadcastSkillInvoke(skillName, 3)
    room:notifySkillInvoked(player, skillName, "negative")
    room:updateQuestSkillState(player, skillName, true)
    room:setPlayerMark(player, skillName, 0)
    room:invalidateSkill(player, skillName)
  end,
})

mouHuoji:addEffect(fk.Damage, {
  can_refresh = function (self, event, target, player, data)
    return
      target == player and
      player:hasSkill(mouHuoji.name) and
      not player:getQuestSkillState(mouHuoji.name) and
      data.damageType == fk.FireDamage
  end,
  on_refresh = function (self, event, target, player, data)
    player.room:addPlayerMark(player, "@mou__huoji", data.damage)
  end,
})

mouHuoji:addLoseEffect(function (self, player)
  player.room:setPlayerMark(player, "@mou__huoji", 0)
end)

return mouHuoji
