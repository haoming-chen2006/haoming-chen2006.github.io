local songwei = fk.CreateSkill {
  name = "songwei",
  tags = { Skill.Lord },
}

Fk:loadTranslationTable{
  ["songwei"] = "颂威",
  [":songwei"] = "主公技，当其他魏势力角色的判定结果确定后，若为黑色，其可令你摸一张牌。",

  ["#songwei-invoke"] = "颂威：你可以令 %src 摸一张牌",

  ["$songwei1"] = "千秋万载，一统江山！",
  ["$songwei2"] = "仙福永享，寿与天齐！",
}

songwei:addEffect(fk.FinishJudge, {
  anim_type = "drawcard",
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(songwei.name) and target ~= player and target.kingdom == "wei" and data.card.color == Card.Black and
      not target.dead
  end,
  on_cost = function(self, event, target, player, data)
    return player.room:askToSkillInvoke(target, {
      skill_name = songwei.name,
      prompt = "#songwei-invoke:"..player.id,
    })
  end,
  on_use = function(self, event, target, player, data)
    player:drawCards(1, songwei.name)
  end,
})

songwei:addAI(Fk.Ltk.AI.newInvokeStrategy{
  think = function(self, ai)
    local target = ai.room:getPlayerById(tonumber(string.split(ai.data[2], ":")[2]))
    return ai:getBenefitOfEvents(function(logic)
      logic:drawCards(target, 1, songwei.name)
    end) >= 0
  end,
})

return songwei
