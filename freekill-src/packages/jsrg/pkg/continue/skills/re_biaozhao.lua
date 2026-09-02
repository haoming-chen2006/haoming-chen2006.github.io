local biaozhao = fk.CreateSkill {
  name = "re__biaozhao",
}

Fk:loadTranslationTable{
  ["re__biaozhao"] = "表召",
  [":re__biaozhao"] = "准备阶段，你可以选择一名其他角色，直到你下回合开始时或你进入濒死状态，除其以外的所有角色对其使用牌无次数限制，"..
  "其对你使用牌造成伤害+1。",

  ["#re__biaozhao-choose"] = "表召：选择一名角色，所有角色对其使用牌无次数限制，其使用牌对你造成伤害+1",
  ["@@re__biaozhao"] = "表召",
}

biaozhao:addEffect(fk.EventPhaseStart, {
  anim_type = "control",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(biaozhao.name) and player.phase == Player.Start and
      #player.room:getOtherPlayers(player, false) > 0
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local to = room:askToChoosePlayers(player, {
      targets = room:getOtherPlayers(player, false),
      min_num = 1,
      max_num = 1,
      prompt = "#re__biaozhao-choose",
      skill_name = biaozhao.name,
      cancelable = true
    })
    if #to > 0 then
      event:setCostData(self, {tos = to})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local to = event:getCostData(self).tos[1]
    room:addTableMark(to, "@@re__biaozhao", player.id)
  end,
})

local spec = {
  can_refresh = function(self, event, target, player, data)
    return target == player
  end,
  on_refresh = function(self, event, target, player, data)
    local room = player.room
    for _, p in ipairs(room.alive_players) do
      room:removeTableMark(p, "@@re__biaozhao", player.id)
    end
  end,
}
biaozhao:addEffect(fk.TurnStart, spec)
biaozhao:addEffect(fk.EnterDying, spec)

biaozhao:addEffect("targetmod", {
  bypass_times = function(self, player, skill, scope, card, to)
    return card and to and to:getMark("@@re__biaozhao") ~= 0 and to ~= player
  end,
})

biaozhao:addEffect(fk.DamageCaused, {
  anim_type = "negative",
  is_delay_effect = true,
  can_trigger = function(self, event, target, player, data)
    return data.to == player and target and data.card and table.contains(target:getTableMark("@@re__biaozhao"), player.id)
  end,
  on_use = function(self, event, target, player, data)
    data:changeDamage(1)
  end,
})

return biaozhao
