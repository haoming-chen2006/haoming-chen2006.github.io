local huashen = fk.CreateSkill {
  name = "huashen",
}

Fk:loadTranslationTable{
  ["huashen"] = "化身",
  [":huashen"] = "游戏开始前，你获得两张未加入游戏的武将牌，称为“化身”，然后选择一张“化身”的一个技能（主公技、限定技、觉醒技除外）。"..
  "回合开始时和回合结束后，你可以重新选择一张“化身”的一个技能。你获得你以此法选择的技能且性别与势力改为与此“化身”相同。",

  ["@[private]&huanshen"] = "化身",
  ["#huashen"] = "化身：请选择要化身的技能",
  ["@huanshen_skill"] = "化身",

  ["$huashen1"] = "哼，肉眼凡胎，岂能窥视仙人变幻？",
  ["$huashen2"] = "万物苍生，幻化由心。",
}

local U = require "packages.utility.utility"

local function DoHuashen(player)
  local room = player.room
  local huashens = U.getPrivateMark(player, "&huanshen")
  if huashens == 0 or #huashens == 0 then return end
  local name = room:askToChooseGeneral(player, {
    generals = huashens,
    n = 1,
  })
  local general = Fk.generals[name]

  local kingdom = general.kingdom
  if general.kingdom == "god" or general.subkingdom then
    local allKingdoms = {}
    if general.kingdom == "god" then
      allKingdoms = {"wei", "shu", "wu", "qun", "jin"}
    elseif general.subkingdom then
      allKingdoms = { general.kingdom, general.subkingdom }
    end
    kingdom = room:askToChoice(player, {
      choices = allKingdoms,
      skill_name = "AskForKingdom",
      prompt = "#ChooseInitialKingdom",
    })
  end
  player.kingdom = kingdom
  room:broadcastProperty(player, "kingdom")
  player.gender = general.gender
  room:broadcastProperty(player, "gender")
  local original_general = player.general
  player.general = general.name
  room:broadcastProperty(player, "general")

  local skills = {}
  for _, skill_name in ipairs(general:getSkillNameList()) do
    local s = Fk.skills[skill_name]
    if not table.find({Skill.Lord, Skill.Limited, Skill.Wake}, function (tag)
        return s:hasTag(tag)
      end) then
      if not s:hasTag(Skill.AttachedKingdom) or table.contains(s:getSkeleton().attached_kingdom, player.kingdom) then
        table.insert(skills, s.name)
      end
    end
  end
  if #skills > 0 then
    local skill = room:askToChoice(player, {
      choices = skills,
      skill_name = "huashen",
      prompt = "#huashen",
      detailed = true,
    })
    local huanshen_skill = skill
    if player:getMark("@huanshen_skill") ~= 0 then huanshen_skill = "-"..player:getMark("@huanshen_skill").."|"..skill end
    room:setPlayerMark(player, "@huanshen_skill", skill)
    room:handleAddLoseSkills(player, huanshen_skill, nil, true, false)
  end
  player.general = original_general
  room:broadcastProperty(player, "general")
end

huashen:addEffect(fk.GameStart, {
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(huashen.name)
  end,
  on_cost = Util.TrueFunc,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local generals = room:getNGenerals(2)
    U.setPrivateMark(player, "&huanshen", generals)
    DoHuashen(player)
  end,
})
huashen:addEffect(fk.TurnStart, {
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(huashen.name)
  end,
  on_cost = function (self, event, target, player, data)
    return player.room:askToSkillInvoke(player, {
      skill_name = huashen.name,
    })
  end,
  on_use = function(self, event, target, player, data)
    DoHuashen(player)
  end,
})
huashen:addEffect(fk.TurnEnd, {
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(huashen.name)
  end,
  on_cost = function (self, event, target, player, data)
    return player.room:askToSkillInvoke(player, {
      skill_name = huashen.name,
    })
  end,
  on_use = function(self, event, target, player, data)
    DoHuashen(player)
  end,
})

return huashen
