local fayi = fk.CreateSkill {
  name = "fayi",
}

Fk:loadTranslationTable{
  ["fayi"] = "伐异",
  [":fayi"] = "当你参与议事结束后，你可以对任意名意见与你不同的角色各造成1点伤害。",

  ["#fayi-choose"] = "伐异：你可以对任意名意见与你不同的角色造成伤害",
}

local U = require "packages.utility.utility"

fayi:addEffect(U.DiscussionFinished, {
  anim_type = "offensive",
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(fayi.name) and data.results[player] and
      table.find(data.tos, function(p)
        return not p.dead and data.results[p] and data.results[player].opinion ~= data.results[p].opinion
      end)
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local targets = table.filter(data.tos, function(p)
      return not p.dead and data.results[p] and data.results[player].opinion ~= data.results[p].opinion
    end)
    local tos = room:askToChoosePlayers(player, {
      targets = targets,
      min_num = 1,
      max_num = 9,
      prompt = "#fayi-choose",
      skill_name = fayi.name,
      cancelable = true,
    })
    if #tos > 0 then
      room:sortByAction(tos)
      event:setCostData(self, {tos = tos})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    for _, p in ipairs(event:getCostData(self).tos) do
      if not p.dead then
        room:damage{
          from = player,
          to = p,
          damage = 1,
          skillName = fayi.name,
        }
      end
    end
  end,
})

return fayi
