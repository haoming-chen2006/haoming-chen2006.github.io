
local fusui = fk.CreateSkill {
  name = "fusui",
  tags = { Skill.Limited },
  related_skills = { "biyi" },
}

Fk:loadTranslationTable{
  ["fusui"] = "妇随",
  [":fusui"] = "限定技，出牌阶段，你可以令一名男性角色失去一个非标签技能，然后你与其获得〖比翼〗并防止你们本轮受到的伤害。",

  ["#fusui"] = "妇随：令一名男性角色失去一个非标签技能，你与其获得“比翼”并防止你们本轮受到的伤害",
  ["#fusui-choice"] = "妇随：选择令 %dest 失去的技能",
  ["@@fusui-round"] = "免疫伤害",
}

local U = require "packages.utility.utility"

fusui:addEffect("active", {
  prompt = "#fusui",
  card_num = 0,
  target_num = 1,
  can_use = function(self, player)
    return player:usedSkillTimes(fusui.name, Player.HistoryGame) == 0
  end,
  card_filter = Util.FalseFunc,
  target_filter = function(self, player, to_select, selected)
    return #selected == 0 and to_select:isMale() and
      table.find(to_select:getSkillNameList(), function (s)
        return #(Fk.skills[s]:getSkeleton() or {}).tags == 0
      end)
  end,
  on_use = function(self, room, effect)
    local player = effect.from
    local target = effect.tos[1]
    local skills = table.filter(target:getSkillNameList(), function (s)
      return #(Fk.skills[s]:getSkeleton() or {}).tags == 0
    end)
    local choice = U.askToChooseSkills(player, {
      skill_name = fusui.name,
      skills = skills,
      prompt = "#fusui-choice::"..target.id,
    })[1]
    room:setPlayerMark(player, "biyi", choice)
    room:setPlayerMark(target, "biyi", choice)
    room:setPlayerMark(player, "@@fusui-round", 1)
    room:setPlayerMark(target, "@@fusui-round", 1)
    room:handleAddLoseSkills(player, "biyi|"..choice)
    room:handleAddLoseSkills(target, "biyi")
  end,
})

fusui:addEffect(fk.DetermineDamageInflicted, {
  mute = true,
  is_delay_effect = true,
  can_trigger = function(self, event, target, player, data)
    return target == player and player:getMark("@@fusui-round") > 0
  end,
  on_use = function(self, event, target, player, data)
    data:preventDamage()
  end,
})

return fusui
