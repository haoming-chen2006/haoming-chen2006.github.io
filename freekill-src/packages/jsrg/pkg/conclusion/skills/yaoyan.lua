local yaoyan = fk.CreateSkill {
  name = "yaoyan",
}

Fk:loadTranslationTable{
  ["yaoyan"] = "邀宴",
  [":yaoyan"] = "准备阶段开始时，你可以令所有角色依次选择是否于本回合结束时参与议事，若此议事结果为：红色，你获得至少一名未参与议事的角色"..
  "各一张手牌；黑色，你对一名参与议事的角色造成2点伤害。",

  ["#yaoyan-ask"] = "邀宴；你是否于本回合结束后参与议事？",
  ["@@yaoyan-turn"] = "邀宴",
  ["#yaoyan-prey"] = "邀宴；获得任意名未参与议事的角色各一张手牌",
  ["#yaoyan-damage"] = "邀宴：对一名参与议事的角色造成2点伤害",
}

local U = require "packages.utility.utility"

yaoyan:addEffect(fk.EventPhaseStart, {
  anim_type = "offensive",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(yaoyan.name) and player.phase == Player.Start
  end,
  on_cost = function (self, event, target, player, data)
    local room = player.room
    if room:askToSkillInvoke(player, {
      skill_name = yaoyan.name,
    }) then
      event:setCostData(self, {tos = room:getAlivePlayers()})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    room:setPlayerMark(player, "yaoyan_owner-turn", 1)
    for _, p in ipairs(room:getAlivePlayers()) do
      if room:askToSkillInvoke(p, {
        skill_name = yaoyan.name,
        prompt = "#yaoyan-ask",
      }) then
        room:setPlayerMark(p, "@@yaoyan-turn", 1)
      end
    end
  end,
})

yaoyan:addEffect(fk.TurnEnd, {
  anim_type = "offensive",
  is_delay_effect = true,
  can_trigger = function(self, event, target, player, data)
    return target == player and player:usedSkillTimes(yaoyan.name, Player.HistoryTurn) > 0 and not player.dead and
      table.find(player.room.alive_players, function(p)
        return p:getMark("@@yaoyan-turn") > 0 and not p:isKongcheng()
      end)
  end,
  on_cost = function (self, event, target, player, data)
    local room = player.room
    local tos = table.filter(room:getAlivePlayers(), function(p)
      return p:getMark("@@yaoyan-turn") > 0 and not p:isKongcheng()
    end)
    event:setCostData(self, {tos = tos})
    return true
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local targets = event:getCostData(self).tos
    local discussion = U.Discussion(player, targets, yaoyan.name)
    if player.dead then return end
    if discussion.color == "red" then
      local tos = table.filter(room.alive_players, function(p)
        return not table.contains(targets, p) and not p:isKongcheng()
      end)
      if #tos > 0 then
        tos = room:askToChoosePlayers(player, {
          targets = tos,
          min_num = 1,
          max_num = 9,
          prompt = "#yaoyan-prey",
          skill_name = yaoyan.name,
          cancelable = false,
        })
        room:sortByAction(tos)
        for _, p in ipairs(tos) do
          if player.dead then return end
          if not p:isKongcheng() then
            local card = room:askToChooseCard(player, {
              target = p,
              flag = "h",
              skill_name = yaoyan.name,
            })
            room:obtainCard(player, card, false, fk.ReasonPrey, player, yaoyan.name)
          end
        end
      end
    elseif discussion.color == "black" then
      targets = table.filter(targets, function(p)
        return not p.dead
      end)
      if #targets > 0 then
        local to = room:askToChoosePlayers(player, {
          targets = targets,
          min_num = 1,
          max_num = 1,
          prompt = "#yaoyan-damage",
          skill_name = yaoyan.name,
          cancelable = false,
        })[1]
        room:damage{
          from = player,
          to = to,
          damage = 2,
          skillName = yaoyan.name,
        }
      end
    end
  end,
})

return yaoyan
