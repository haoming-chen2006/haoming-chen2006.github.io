local mouYijue = fk.CreateSkill({
  name = "mou__yijue",
  tags = { Skill.Compulsory },
})

Fk:loadTranslationTable{
  ["mou__yijue"] = "义绝",
  [":mou__yijue"] = "锁定技，每名角色限一次，当其他角色于你的回合内对受到你造成的伤害时，若伤害值不小于其体力值和护甲之和，" ..
  "则防止此伤害，且直到本回合结束，当你使用牌指定其为目标时，取消之。",
  ["@[mou__yijue]"] = "义绝",

  ["$mou__yijue1"] = "承君之恩，今日尽报。",
  ["$mou__yijue2"] = "下次沙场相见，关某定不留情。",
}

Fk:addQmlMark{
  name = "mou__yijue",
  qml_path = function(name, value, p)
    return "packages/mougong/qml/YiJueBox"
  end,
  how_to_show = function(name, value, p)
    if type(value) == "table" then
      return tostring(#value)
    end
    return " "
  end,
}

mouYijue:addEffect(fk.DetermineDamageInflicted, {
  anim_type = "negative",
  can_trigger = function(self, event, target, player, data)
    return
      data.from == player and
      player:hasSkill(mouYijue.name) and
      player.phase ~= Player.NotActive and
      player ~= data.to and
      data.to:isAlive() and
      data.damage >= math.max(0, data.to.hp) + data.to.shield and
      not table.contains(player.tag["mou__yijue_targets"] or {}, data.to.id)
  end,
  on_use = function(self, event, target, player, data)
    local yijueTargets = player.tag["mou__yijue_targets"] or {}
    table.insertIfNeed(yijueTargets, data.to.id)
    player.tag["mou__yijue_targets"] = yijueTargets

    local room = player.room
    room:setPlayerMark(
      player,
      "@[mou__yijue]",
      table.map(yijueTargets, function(id) return room:getPlayerById(id).seat end)
    )
    room:setPlayerMark(data.to, "mou__yijue-turn", player.id)

    data:preventDamage()
  end,
})

mouYijue:addEffect(fk.TargetSpecifying, {
  mute = true,
  can_trigger = function(self, event, target, player, data)
    return target == player and data.to:getMark("mou__yijue-turn") == player.id and not data.cancelled
  end,
  on_cost = Util.TrueFunc,
  on_use = function(self, event, target, player, data)
    data:cancelCurrentTarget()
  end,
})

return mouYijue
