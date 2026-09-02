local duanbing = fk.CreateSkill {
  name = "sp__duanbing",
}

Fk:loadTranslationTable{
  ["sp__duanbing"] = "短兵",
  [":sp__duanbing"] = "你使用【杀】时可以额外选择一名距离为1的其他角色为目标。",

  ["#sp__duanbing-choose"] = "短兵：你可以额外选择一名距离为1的其他角色为目标",

  ["$sp__duanbing1"] = "众将官，短刀出鞘。",
  ["$sp__duanbing2"] = "短兵轻甲也可取汝性命！",
}

duanbing:addEffect(fk.AfterCardTargetDeclared, {
  anim_type = "offensive",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(duanbing.name) and data.card.trueName == "slash" and
      table.find(data:getExtraTargets(), function(p)
        return player:distanceTo(p) == 1
      end)
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local targets = table.filter(data:getExtraTargets(), function(p)
      return player:distanceTo(p) == 1
    end)
    local tos = room:askToChoosePlayers(player, {
      targets = targets,
      min_num = 1,
      max_num = 1,
      prompt = "#sp__duanbing-choose",
      skill_name = duanbing.name,
      cancelable = true,
    })
    if #tos > 0 then
      event:setCostData(self, {tos = tos})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    data:addTarget(event:getCostData(self).tos[1])
  end,
})

return duanbing
