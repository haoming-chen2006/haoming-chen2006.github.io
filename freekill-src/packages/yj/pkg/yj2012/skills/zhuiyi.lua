local zhuiyi = fk.CreateSkill {
  name = "zhuiyi",
}

Fk:loadTranslationTable{
  ["zhuiyi"] = "追忆",
  [":zhuiyi"] = "你死亡时，可以令一名其他角色（杀死你的角色除外）摸三张牌并回复1点体力。",

  ["#zhuiyi-choose"] = "追忆：你可以令一名角色摸三张牌并回复1点体力",

  ["$zhuiyi1"] = "终其永怀，恋心殷殷。",
  ["$zhuiyi2"] = "妾心所系，如月之恒。",
}

zhuiyi:addEffect(fk.Death, {
  anim_type = "support",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(zhuiyi.name, false, true) and
      table.find(player.room.alive_players, function (p)
        return p ~= data.killer
      end)
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local targets = table.simpleClone(room.alive_players)
    table.removeOne(targets, data.killer)
    local to = room:askToChoosePlayers(player, {
      skill_name = zhuiyi.name,
      min_num = 1,
      max_num = 1,
      targets = targets,
      prompt = "#zhuiyi-choose",
      cancelable = true,
    })
    if #to > 0 then
      event:setCostData(self, {tos = to})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local to = event:getCostData(self).tos[1]
    to:drawCards(3, zhuiyi.name)
    if not to.dead then
      room:recover{
        who = to,
        num = 1,
        recoverBy = player,
        skillName = zhuiyi.name,
      }
    end
  end,
})

zhuiyi:addAI(Fk.Ltk.AI.newChoosePlayersStrategy{
  choose_players = function(self, ai)
    return ai:askToChoosePlayers({
      targets = ai:getEnabledTargets(),
      min_num = 0,
      max_num = 1,
      skill_name = self.skill_name,
      benefit_func = function (logic, p)
        logic:drawCards(p, 3, self.skill_name)
        logic:recover{
          who = p,
          num = 1,
          recoverBy = ai.player,
          skillName = self.skill_name,
        }
      end,
    })
  end,
})

return zhuiyi
