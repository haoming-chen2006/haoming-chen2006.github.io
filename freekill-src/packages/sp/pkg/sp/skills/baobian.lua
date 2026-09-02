local baobian = fk.CreateSkill {
  name = "baobian",
  tags = { Skill.Compulsory },
}

Fk:loadTranslationTable{
  ["baobian"] = "豹变",
  [":baobian"] = "锁定技，若你的体力值为3或更少，你视为拥有技能〖挑衅〗；若你的体力值为2或更少，你视为拥有技能〖咆哮〗；若你的体力值为1，"..
  "你视为拥有技能〖神速〗。",

  ["$baobian1"] = "变可生，不变则死。",
  ["$baobian2"] = "适时而动，穷极则变。",
}

local function baobianChange(player, hp, skill_name)
  local room = player.room
  local skills = player.tag[baobian.name] or {}
  if player.hp <= hp then
    if not table.contains(skills, skill_name) then
      player:broadcastSkillInvoke(baobian.name)
      room:handleAddLoseSkills(player, skill_name, nil, false, true)
      table.insert(skills, skill_name)
    end
  else
    if table.contains(skills, skill_name) then
      room:handleAddLoseSkills(player, "-"..skill_name, nil, false, true)
      table.removeOne(skills, skill_name)
    end
  end
  player.tag[baobian.name] = skills
end

local spec = {
  can_refresh = function(self, event, target, player, data)
    return player:hasSkill(baobian.name, true)
  end,
  on_refresh = function(self, event, target, player, data)
    baobianChange(player, 1, "ol_ex__shensu")
    baobianChange(player, 2, "ex__paoxiao")
    baobianChange(player, 3, "ol_ex__tiaoxin")
  end,
}

baobian:addEffect(fk.HpChanged, spec)
baobian:addEffect(fk.MaxHpChanged, spec)

baobian:addEffect(fk.EventLoseSkill, {
  is_delay_effect = true,
  can_trigger = function (self, event, target, player, data)
    return target == player and data.name == baobian.name and #(player.tag[baobian.name] or {}) > 0
  end,
  on_use = function (self, event, target, player, data)
    local skills = player.tag[baobian.name]
    player.room:handleAddLoseSkills(player, "-"..table.concat(skills, "|"), nil, false, true)
    player.tag[baobian.name] = nil
  end,
})

return baobian
