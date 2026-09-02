local xingshuai = fk.CreateSkill {
  name = "xingshuai",
  tags = { Skill.Lord, Skill.Limited },
}

Fk:loadTranslationTable{
  ["xingshuai"] = "兴衰",
  [":xingshuai"] = "主公技，限定技，当你进入濒死状态时，你可令其他魏势力角色依次选择是否令你回复1点体力。选择是的角色在此次濒死结算结束后"..
  "受到1点无来源的伤害。",

  ["#xingshuai-invoke"] = "兴衰：其他魏势力角色可以受到1点伤害，令你回复1点体力",
  ["#xingshuai-ask"] = "兴衰：你可以令 %dest 回复1点体力，结算后你受到1点伤害",

  ["$xingshuai1"] = "百年兴衰皆由人，不由天！",
  ["$xingshuai2"] = "聚群臣而嘉勋，隆天子之气运！",
}

xingshuai:addEffect(fk.EnterDying, {
  anim_type = "defensive",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(xingshuai.name) and
      player:usedSkillTimes(xingshuai.name, Player.HistoryGame) == 0 and
      table.find(player.room:getOtherPlayers(player, false), function(p)
        return p.kingdom == "wei"
      end)
  end,
  on_cost = function (self, event, target, player, data)
    local room = player.room
    if room:askToSkillInvoke(player, {
      skill_name = xingshuai.name,
      prompt = "#xingshuai-invoke",
    }) then
      local targets = table.filter(room:getOtherPlayers(player), function(p)
        return p.kingdom == "wei"
      end)
      event:setCostData(self, {tos = targets})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local targets = {}
    for _, p in ipairs(room:getOtherPlayers(player)) do
      if p.kingdom == "wei" and
        room:askToSkillInvoke(p, {
          skill_name = xingshuai.name,
          prompt = "#xingshuai-ask::"..player.id
        }) then
        table.insert(targets, p)
      end
    end
    if #targets > 0 then
      room.logic:getCurrentEvent():findParent(GameEvent.Dying, true):addCleaner(function()
        for _, p in ipairs(targets) do
          if not p.dead then
            room:damage{
              to = p,
              damage = 1,
              skillName = xingshuai.name,
            }
          end
        end
      end)
      for _, p in ipairs(targets) do
        if player.dead or not player:isWounded() then break end
        room:recover{
          who = player,
          num = 1,
          recoverBy = p,
          skillName = xingshuai.name,
        }
      end
    end
  end,
})

return xingshuai
