local baonue = fk.CreateSkill {
  name = "baonue",
  tags = { Skill.Lord },
}

Fk:loadTranslationTable{
  ["baonue"] = "暴虐",
  [":baonue"] = "主公技，其他群雄角色造成伤害后，其可以判定，若结果为♠，你回复1点体力。",

  ["#baonue-invoke"] = "暴虐：你可以判定，若为♠，%src 回复1点体力",

  ["$baonue1"] = "顺我者昌，逆我者亡！",
  ["$baonue2"] = "哈哈哈哈！",
}

baonue:addEffect(fk.Damage, {
  anim_type = "support",
  can_trigger = function(self, event, target, player, data)
    return target and player:hasSkill(baonue.name) and target ~= player and target.kingdom == "qun" and not target.dead
  end,
  on_cost = function(self, event, target, player, data)
    return player.room:askToSkillInvoke(target, {
      skill_name = baonue.name,
      prompt = "#baonue-invoke:"..player.id,
    })
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local judge = {
      who = target,
      reason = baonue.name,
      pattern = ".|.|spade",
    }
    room:judge(judge)
    if judge:matchPattern() and not player.dead then
      room:recover{
        who = player,
        num = 1,
        recoverBy = target,
        skillName = baonue.name,
      }
    end
  end,
})

baonue:addAI(Fk.Ltk.AI.newInvokeStrategy{
  think = function(self, ai)
    local target = ai.room:getPlayerById(tonumber(string.split(ai.data[2], ":")[2]))
    return ai:getBenefitOfEvents(function(logic)
      logic:judge({
        who = ai.player,
        reason = baonue.name,
        pattern = ".|.|spade",
      })
      logic:recover({
        who = target,
        num = 1,
        recoverBy = ai.player,
        skillName = baonue.name,
      })
    end) >= 0
  end,
})

return baonue
