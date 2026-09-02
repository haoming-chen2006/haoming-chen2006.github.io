local weidi = fk.CreateSkill {
  name = "weidi",
  tags = { Skill.Compulsory },
}

Fk:loadTranslationTable{
  ["weidi"] = "伪帝",
  [":weidi"] = "锁定技，你视为拥有主公的主公技。",

  ["$weidi1"] = "你们都得听我的号令！",
  ["$weidi2"] = "我才是皇帝！",
}

local spec = {
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(weidi.name) and
      table.find(player.room:getOtherPlayers(player, false), function (p)
        return p.role == "lord" and
          table.find(p:getSkillNameList(), function(s)
            return Fk.skills[s]:hasTag(Skill.Lord) and not player:hasSkill(s, true)
          end) ~= nil
      end)
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local skills = {}
    for _, p in ipairs(player.room:getOtherPlayers(player, false)) do
      if p.role == "lord" then
        for _, s in ipairs(p:getSkillNameList()) do
          if Fk.skills[s]:hasTag(Skill.Lord) and not player:hasSkill(s, true) then
            table.insert(skills, s)
          end
        end
      end
    end
    if #skills > 0 then
      room:handleAddLoseSkills(player, table.concat(skills, "|"))
    end
  end,
}

weidi:addEffect(fk.GameStart, spec)
weidi:addEffect(fk.EventAcquireSkill, spec)

return weidi
