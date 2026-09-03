
local yinfengc = fk.CreateSkill{
  name = "yinfengc",
  tags = { Skill.Compulsory },
}

Fk:loadTranslationTable{
  ["yinfengc"] = "阴锋",
  [":yinfengc"] = "锁定技，当你每回合首次造成伤害后，将受伤角色体力上限减至其体力值且其接下来造成和受到的伤害均视为失去体力，直到你下回合开始。",

  ["@yinfengc"] = "阴锋",
}

yinfengc:addEffect(fk.Damage, {
  anim_type = "offensive",
  can_trigger = function (self, event, target, player, data)
    if target == player and player:hasSkill(yinfengc.name) and player:usedEffectTimes(self.name) == 0 and not data.to.dead then
      local damage_events = player.room.logic:getActualDamageEvents(1, function(e)
        return e.data.from == player
      end)
      return #damage_events == 1 and damage_events[1].data == data
    end
  end,
  on_use = function (self, event, target, player, data)
    local room = player.room
    local to = data.to
    local n = math.max(0, to:getLostHp())
    if n > 0 then
      room:changeMaxHp(to, -n)
    end
    if not to.dead then
      local record = player:getTableMark("_yinfengc")
      table.insertTable(record, { to, n })
      room:setPlayerMark(player, "_yinfengc", record)
      record = player:getTableMark("@yinfengc")
      table.insertTable(record, { to.general, n })
      room:setPlayerMark(player, "@yinfengc", record)
      room:addPlayerMark(to, yinfengc.name)
    end
  end,
})

yinfengc:addEffect(fk.PreDamage, {
  anim_type = "offensive",
  is_delay_effect = true,
  can_trigger = function(self, event, target, player, data)
    return player:getMark(yinfengc.name) ~= 0 and
      (target == player or data.to == player)
  end,
  on_use = function(self, event, target, player, data)
    player.room:loseHp(data.to, data.damage, yinfengc.name)
    data:preventDamage()
  end,
})

local removeYinfengc = function (player)
  local room = player.room
  local record = player:getTableMark("_yinfengc")
  local to
  for i, v in ipairs(record) do
    if i % 2 == 1 then
      to = v
    else
      room:changeMaxHp(to, v)
      room:removePlayerMark(to, yinfengc.name)
    end
  end
  room:setPlayerMark(player, "_yinfengc", 0)
  room:setPlayerMark(player, "@yinfengc", 0)
end

yinfengc:addEffect(fk.TurnStart, {
  can_refresh = function (self, event, target, player, data)
    return target == player and player:getMark("_yinfengc") ~= 0
  end,
  on_refresh = function (self, event, target, player, data)
    removeYinfengc(player)
  end,
})

yinfengc:addLoseEffect(function (self, player, is_death)
  removeYinfengc(player)
end)

return yinfengc
