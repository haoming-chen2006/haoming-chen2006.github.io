local xuanhua = fk.CreateSkill {
  name = "xuanhua",
}

Fk:loadTranslationTable{
  ["xuanhua"] = "宣化",
  [":xuanhua"] = "准备阶段，你可以进行一次【闪电】判定，若你未受到伤害，你可以令一名角色回复1点体力；结束阶段，你可以进行一次"..
  "条件反转的【闪电】判定，若你未受到伤害，你可以对一名角色造成1点雷电伤害。",

  ["#xuanhua1-invoke"] = "宣化：你可以进行【闪电】判定，若未受到伤害，你可以令一名角色回复1点体力",
  ["#xuanhua2-invoke"] = "宣化：你可以进行反转的【闪电】判定，若未受到伤害，你可以对一名角色造成1点雷电伤害",

  ["#xuanhua1-choose"] = "宣化：你可以令一名角色回复1点体力",
  ["#xuanhua2-choose"] = "宣化：你可以对一名角色造成1点雷电伤害",
}

xuanhua:addEffect(fk.EventPhaseStart, {
  anim_type = "special",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(xuanhua.name) and
      (player.phase == Player.Start or player.phase == Player.Finish)
  end,
  on_cost = function(self, event, target, player, data)
    local prompt = "#xuanhua1-invoke"
    if player.phase == Player.Finish then
      prompt = "#xuanhua2-invoke"
    end
    return player.room:askToSkillInvoke(player, {
      skill_name = xuanhua.name,
      prompt = prompt,
    })
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local judge = JudgeData:new {
      who = player,
      reason = "lightning",
      pattern = ".|2~9|spade",
    }
    if player.phase == Player.Finish then
      judge:reversePattern()
    end
    room:judge(judge)
    if judge:matchPattern() then
      room:damage{
        to = player,
        damage = 3,
        damageType = fk.ThunderDamage,
        skillName = "lightning_skill",
        extra_data = {
          xuanhua = player,
        }
      }
    end
    if not player.dead and player:getMark("xuanhua-phase") == 0 then
      local targets = table.filter(room.alive_players, function(p)
        return p:isWounded()
      end)
      local prompt = "#xuanhua1-choose"
      if player.phase == Player.Finish then
        targets = room.alive_players
        prompt = "#xuanhua2-choose"
      end
      if #targets == 0 then return end
      local to = room:askToChoosePlayers(player, {
        targets = targets,
        min_num = 1,
        max_num = 1,
        skill_name = xuanhua.name,
        prompt = prompt,
      })
      if #to > 0 then
        to = to[1]
        if player.phase == Player.Start then
          room:recover{
            who = to,
            num = 1,
            recoverBy = player,
            skillName = xuanhua.name,
          }
        else
          room:damage{
            from = player,
            to = to,
            damage = 1,
            damageType = fk.ThunderDamage,
            skillName = xuanhua.name,
          }
        end
      end
    end
  end,
})

xuanhua:addEffect(fk.Damaged, {
  can_refresh = function(self, event, target, player, data)
    return target == player and data.extra_data and data.extra_data.xuanhua == player and not player.dead
  end,
  on_refresh = function(self, event, target, player, data)
    player.room:setPlayerMark(player, "xuanhua-phase", 1)
  end,
})

return xuanhua
