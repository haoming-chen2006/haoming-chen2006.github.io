
local biyi = fk.CreateSkill {
  name = "biyi",
  tags = { Skill.Switch },
  dynamic_desc = function (self, player, lang)
    return "biyi_inner:"..player:getMark(self.name)
  end,
}

Fk:loadTranslationTable{
  ["biyi"] = "比翼",
  [":biyi"] = "转换技，阳：因此次〖妇随〗失去的技能；阴，〖枭姬〗。",

  [":biyi_inner"] = "转换技，阳：〖{1}〗；阴，〖枭姬〗。",
}

biyi:addEffect(fk.SkillEffect, {
  can_trigger = function(self, event, target, player, data)
    if target == player and player:hasSkill(biyi.name) and
      data.skill:isPlayerSkill(player) then
      if player:getSwitchSkillState(biyi.name) == fk.SwitchYang then
        return data.skill:getSkeleton().name == player:getMark(biyi.name)
      else
        return data.skill:getSkeleton().name == "xiaoji"
      end
    end
  end,
  on_cost = Util.TrueFunc,
  on_use = function (self, event, target, player, data)
    local room = player.room
    local skills = "-"..data.skill:getSkeleton().name
    if player:currentSwitchState() == fk.SwitchYang then
      skills = skills.."|xiaoji"
    else
      skills = skills.."|"..player:getMark(biyi.name)
    end
    room:handleAddLoseSkills(player, skills)
  end,
})

return biyi
