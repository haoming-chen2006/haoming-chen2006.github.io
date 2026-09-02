local shichou = fk.CreateSkill {
  name = "shichou",
}

Fk:loadTranslationTable {
  ["shichou"] = "誓仇",
  [":shichou"] = "你使用【杀】可以额外选择至多X名角色为目标（X为你已损失的体力值）。",

  ["#shichou-choose"] = "誓仇：你可以为此%arg额外指定至多%arg2个目标",

  ["$shichou1"] = "灭族之恨，不共戴天！",
  ["$shichou2"] = "休想跑！",
}

shichou:addEffect(fk.AfterCardTargetDeclared, {
  anim_type = "offensive",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(shichou.name) and data.card.trueName == "slash" and
      player:isWounded() and #data:getExtraTargets() > 0
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local n = player:getLostHp()
    local tos = room:askToChoosePlayers(player, {
      targets = data:getExtraTargets(),
      min_num = 1,
      max_num = n,
      prompt = "#shichou-choose:::"..data.card:toLogString()..":"..n,
      skill_name = shichou.name,
      cancelable = true,
    })
    if #tos > 0 then
      room:sortByAction(tos)
      event:setCostData(self, {tos = tos})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local tos = table.simpleClone(event:getCostData(self).tos)
    player.room:sendLog{
      type = "#AddTargetsBySkill",
      from = target.id,
      to = table.map(tos, Util.IdMapper),
      arg = shichou.name,
      arg2 = data.card:toLogString(),
    }
    for _, p in ipairs(tos) do
      data:addTarget(p)
    end
  end,
})

return shichou
