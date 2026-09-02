local xiaode = fk.CreateSkill {
  name = "xiaode",
}
local U = require "packages.utility.utility"

Fk:loadTranslationTable {
  ["xiaode"] = "孝德",
  [":xiaode"] = "当其他角色阵亡后，你可以声明其武将牌上的一项技能，若如此做，你获得此技能并失去技能〖孝德〗直到你的回合结束。"..
  "（不能声明觉醒技或主公技）",

  ["#xiaode-invoke"] = "孝德：你可以获得 %dest 武将牌上的一个技能直到你的回合结束",

  ["$xiaode"] = "有孝有德，以引为翼。",
}

xiaode:addEffect(fk.Deathed, {
  can_trigger = function(self, event, target, player, data)
    if player:hasSkill(xiaode.name) then
      local choices = {}
      local skills = Fk.generals[target.general]:getSkillNameList()
      if target.deputyGeneral ~= "" then
        table.insertTable(skills, Fk.generals[target.deputyGeneral]:getSkillNameList())
      end
      for _, skill_name in ipairs(skills) do
        local skill = Fk.skills[skill_name]
        if not player:hasSkill(skill, true) and not skill:hasTag(Skill.Wake) and
          not skill:hasTag(Skill.Lord) then
          table.insertIfNeed(choices, skill_name)
        end
      end
      if #choices > 0 then
        event:setCostData(self, {extra_data = choices})
        return true
      end
    end
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local skills = event:getCostData(self).extra_data
    local result = U.askToChooseSkills(
      player,
      {
        skill_name = xiaode.name,
        skills = skills,
        max_num = 1,
        min_num = 0,
        prompt = "#xiaode-invoke::" .. target.id,
      }
    )
    if #result > 0 then
      event:setCostData(self, { tos = { target }, choice = result[1] })
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local choice = event:getCostData(self).choice
    room:addTableMarkIfNeed(player, xiaode.name, choice)
    room:handleAddLoseSkills(player, choice .. "|-xiaode")
  end,
})

xiaode:addEffect(fk.TurnEnd, {
  can_refresh = function(self, event, target, player, data)
    return target == player and player:getMark(xiaode.name) ~= 0
  end,
  on_refresh = function(self, event, target, player, data)
    local room = player.room
    local skills = xiaode.name
    for _, skill in ipairs(player:getMark(xiaode.name)) do
      if player:hasSkill(skill, true) then
        skills = skills .. "|-" .. skill
      end
    end
    room:setPlayerMark(player, xiaode.name, 0)
    room:handleAddLoseSkills(player, skills)
  end,
})

return xiaode
