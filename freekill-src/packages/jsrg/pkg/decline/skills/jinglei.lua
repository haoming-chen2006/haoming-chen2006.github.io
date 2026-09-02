local jinglei = fk.CreateSkill {
  name = "js__jinglei",
}

Fk:loadTranslationTable{
  ["js__jinglei"] = "惊雷",
  [":js__jinglei"] = "准备阶段，你可以选择一名手牌数不为最少的角色，然后你令任意名手牌数之和小于其的角色各对其造成1点雷电伤害。",

  ["#js__jinglei-choose"] = "惊雷：选择一名角色，令任意名手牌数之和小于其的角色各对其造成1点雷电伤害",
  ["#js__jinglei-use"] = "惊雷：选择任意名手牌数之和不大于 %arg 的角色，各对 %dest 造成1点雷电伤害！",
}

jinglei:addEffect(fk.EventPhaseStart, {
  anim_type = "offensive",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(jinglei.name) and player.phase == Player.Start and
      table.find(player.room.alive_players, function (p)
        return table.find(player.room.alive_players, function (q)
          return p:getHandcardNum() > q:getHandcardNum()
        end) ~= nil
      end)
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local targets = table.filter(room.alive_players, function (p)
      return table.find(room.alive_players, function (q)
        return p:getHandcardNum() > q:getHandcardNum()
      end) ~= nil
    end)
    local to = room:askToChoosePlayers(player, {
        targets = targets,
        min_num = 1,
        max_num = 1,
        prompt = "#js__jinglei-choose",
        skill_name = jinglei.name,
      }
    )
    if #to > 0 then
      event:setCostData(self, {tos = to})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local to = event:getCostData(self).tos[1]
    local n = to:getHandcardNum()
    local success, dat = room:askToUseActiveSkill(player, {
      skill_name = "js__jinglei_active",
      prompt = "#js__jinglei-use::" .. to.id .. ":" .. n,
      cancelable = false,
      extra_data = {
        js__jinglei_num = n,
      },
    })
    if success and dat then
      local tos = table.simpleClone(dat.targets)
      room:sortByAction(tos)
      for _, p in ipairs(tos) do
        if to.dead then return end
        room:doIndicate(p, {to})
        room:damage{
          from = p,
          to = to,
          damage = 1,
          damageType = fk.ThunderDamage,
          skillName = jinglei.name,
        }
      end
    end
  end,
})

return jinglei
