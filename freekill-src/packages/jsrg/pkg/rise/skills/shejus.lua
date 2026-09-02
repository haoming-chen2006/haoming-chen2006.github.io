local sheju = fk.CreateSkill {
  name = "shejus",
  tags = { Skill.Compulsory },
}

Fk:loadTranslationTable{
  ["shejus"] = "慑惧",
  [":shejus"] = "锁定技，当你使用【杀】指定唯一目标后或成为【杀】的唯一目标后，你与对方议事：若结果为黑色，双方各减1点体力上限；"..
  "否则意见为黑色的角色摸两张牌。",
}

local U = require "packages.utility.utility"

local spec = {
  on_use = function (self, event, target, player, data)
    local room = player.room
    local to = event:getCostData(self).tos[1]
    local discussion = U.Discussion(player, {player, to}, sheju.name)
    if discussion.color == "black" then
      if not player.dead then
        room:changeMaxHp(player, -1)
      end
      if not to.dead then
        room:changeMaxHp(to, -1)
      end
    else
      for _, p in ipairs({player, to}) do
        if not p.dead and discussion.results[p].opinion == "black" then
          p:drawCards(2, sheju.name)
        end
      end
    end
  end,
}

sheju:addEffect(fk.TargetSpecified, {
  anim_type = "negative",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(sheju.name) and
      data.card.trueName == "slash" and data:isOnlyTarget(data.to) and
      not data.to:isKongcheng() and not player:isKongcheng() and
      not data.to.dead
  end,
  on_cost = function (self, event, target, player, data)
    event:setCostData(self, {tos = {data.to}})
    return true
  end,
  on_use = spec.on_use,
})

sheju:addEffect(fk.TargetConfirmed, {
  anim_type = "negative",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(sheju.name) and
      data.card.trueName == "slash" and data:isOnlyTarget(player) and
      not data.from:isKongcheng() and not player:isKongcheng() and
      not data.from.dead
  end,
  on_cost = function (self, event, target, player, data)
    event:setCostData(self, {tos = {data.from}})
    return true
  end,
  on_use = spec.on_use,
})

return sheju
