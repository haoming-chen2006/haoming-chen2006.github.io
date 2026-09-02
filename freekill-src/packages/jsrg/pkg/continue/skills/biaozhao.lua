local biaozhao = fk.CreateSkill {
  name = "js__biaozhao",
}

Fk:loadTranslationTable{
  ["js__biaozhao"] = "表召",
  [":js__biaozhao"] = "准备阶段，你可以选择两名其他角色，直到你下回合开始时或你死亡后，你选择的第一名角色对第二名角色使用牌无距离次数限制，"..
  "第二名角色对你使用牌造成伤害+1。",

  ["#js__biaozhao-choose"] = "表召：选择两名角色，前者对后者使用牌无距离次数限制，后者使用牌对你造成伤害+1",
  ["@@js__biaozhao1"] = "表召",
  ["@@js__biaozhao2"] = "表召目标",
}

biaozhao:addEffect(fk.EventPhaseStart, {
  anim_type = "control",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(biaozhao.name) and player.phase == Player.Start and
      #player.room:getOtherPlayers(player, false) >= 2
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local tos = room:askToChoosePlayers(player, {
      targets = room:getOtherPlayers(player, false),
      min_num = 2,
      max_num = 2,
      prompt = "#js__biaozhao-choose",
      skill_name = biaozhao.name,
      cancelable = true
    })
    if #tos == 2 then
      event:setCostData(self, {tos = tos})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local targets = event:getCostData(self).tos
    room:addTableMark(targets[1], "@@js__biaozhao1", player.id)
    room:addTableMark(targets[2], "@@js__biaozhao2", player.id)
  end,
})

local spec = {
  can_refresh = function(self, event, target, player, data)
    return target == player
  end,
  on_refresh = function(self, event, target, player, data)
    local room = player.room
    for _, p in ipairs(room.alive_players) do
      room:removeTableMark(p, "@@js__biaozhao1", player.id)
      room:removeTableMark(p, "@@js__biaozhao2", player.id)
    end
  end,
}
biaozhao:addEffect(fk.TurnStart, spec)
biaozhao:addEffect(fk.Death, spec)

biaozhao:addEffect("targetmod", {
  bypass_times = function(self, player, skill, scope, card, to)
    return card and to and
      table.find(to:getTableMark("@@js__biaozhao2"), function(id)
        return table.contains(player:getTableMark("@@js__biaozhao1"), id)
      end)
  end,
  bypass_distances = function(self, player, skill, card, to)
    return card and to and
      table.find(to:getTableMark("@@js__biaozhao2"), function(id)
        return table.contains(player:getTableMark("@@js__biaozhao1"), id)
      end)
  end,
})

biaozhao:addEffect(fk.DamageCaused, {
  anim_type = "negative",
  is_delay_effect = true,
  can_trigger = function(self, event, target, player, data)
    return data.to == player and target and data.card and table.contains(target:getTableMark("@@js__biaozhao2"), player.id)
  end,
  on_use = function(self, event, target, player, data)
    data:changeDamage(1)
  end,
})

return biaozhao
