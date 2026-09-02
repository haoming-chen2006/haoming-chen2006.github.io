local juece = fk.CreateSkill {
  name = "juece",
}

Fk:loadTranslationTable{
  ["juece"] = "绝策",
  [":juece"] = "结束阶段，你可以对一名没有手牌的其他角色造成1点伤害。",

  ["#juece-choose"] = "绝策：你可以对一名没有手牌的其他角色造成1点伤害",

  ["$juece1"] = "哼！你走投无路了。",
  ["$juece2"] = "无用之人，死！",
}

juece:addEffect(fk.EventPhaseStart, {
  anim_type = "offensive",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(juece.name) and player.phase == Player.Finish and
      table.find(player.room:getOtherPlayers(player, false), function(p)
        return p:isKongcheng()
      end)
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local targets = table.filter(room:getOtherPlayers(player, false), function(p)
      return p:isKongcheng()
    end)
    local to = room:askToChoosePlayers(player, {
      skill_name = juece.name,
      min_num = 1,
      max_num = 1,
      targets = targets,
      prompt = "#juece-choose",
      cancelable = true,
    })
    if #to > 0 then
      event:setCostData(self, {tos = to})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    player.room:damage{
      from = player,
      to = event:getCostData(self).tos[1],
      damage = 1,
      skillName = juece.name,
    }
  end,
})

juece:addAI(Fk.Ltk.AI.newChoosePlayersStrategy{
  choose_players = function(self, ai)
    return ai:askToChoosePlayers({
      targets = ai:getEnabledTargets(),
      min_num = 0,
      max_num = 1,
      skill_name = self.skill_name,
      benefit_func = function (logic, p)
        logic:damage({
          from = ai.player,
          to = p,
          damage = 1,
          skillName = self.skill_name,
        })
      end,
    })
  end,
})

return juece
