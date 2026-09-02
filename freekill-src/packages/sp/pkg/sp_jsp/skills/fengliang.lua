
local fengliang = fk.CreateSkill {
  name = "fengliang",
  tags = { Skill.Wake },
}

Fk:loadTranslationTable{
  ["fengliang"] = "逢亮",
  [":fengliang"] = "觉醒技，当你进入濒死状态时，你减1点体力上限并将体力值回复至2点，然后获得技能〖挑衅〗，将技能〖困奋〗改为非锁定技。",

  ["$fengliang1"] = "得遇丞相，再生之德！",
  ["$fengliang2"] = "丞相大义，维岂有不从之理？",
}

fengliang:addEffect(fk.EnterDying, {
  anim_type = "defensive",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(fengliang.name) and
      player:usedSkillTimes(fengliang.name, Player.HistoryGame) == 0
  end,
  can_wake = function(self, event, target, player, data)
    return player.dying
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    room:changeMaxHp(player, -1)
    if player.dead then return end
    if player.hp < 2 and player:isWounded() then
      room:recover{
        who = player,
        num = 2 - player.hp,
        recoverBy = player,
        skillName = fengliang.name,
      }
      if player.dead then return end
    end
    room:handleAddLoseSkills(player, "tiaoxin")
    if player:hasSkill("kunfen", true) then
      if player.phase == Player.Finish and player:usedSkillTimes("kunfen", Player.HistoryPhase) > 0 then
        room:handleAddLoseSkills(player, "-kunfen", nil, false, true)
        local phase = room.logic:getCurrentEvent():findParent(GameEvent.Phase)
        if phase ~= nil then
          phase:addCleaner(function()
            room:handleAddLoseSkills(player, "kunfenEx", nil, false, true)
          end)
        end
      else
        room:handleAddLoseSkills(player, "-kunfen|kunfenEx", nil, false, true)
      end
    end
  end,
})

return fengliang
