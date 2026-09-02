local bazheng = fk.CreateSkill {
  name = "bazheng",
  tags = { Skill.Compulsory },
}

Fk:loadTranslationTable{
  ["bazheng"] = "霸政",
  [":bazheng"] = "锁定技，当你参与的议事展示意见后，参与议事角色中本回合受到过你造成伤害的角色意见改为与你相同。",

  ["#LogChangeOpinion"] = "%to 的意见被视为 %arg",
}

local U = require "packages.utility.utility"

bazheng:addEffect(U.DiscussionResultConfirming, {
  anim_type = "control",
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(bazheng.name) and data.results[player] and
      #player.room.logic:getActualDamageEvents(1, function(e)
        local damage = e.data
        return damage.from == player and damage.to ~= player and not damage.to.dead and data.results[damage.to] ~= nil
      end, Player.HistoryTurn) > 0
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local targets = {}
    player.room.logic:getActualDamageEvents(1, function(e)
      local damage = e.data
      if damage.from == player and damage.to ~= player and not damage.to.dead and data.results[damage.to] then
        data.results[damage.to].opinion = data.results[player].opinion
        table.insert(targets, damage.to)
      end
    end, Player.HistoryTurn)
    room:doIndicate(player, targets)
    local my_opinion = data.results[player].opinion
    room:sendLog{
      type = "#LogChangeOpinion",
      to = table.map(targets, Util.IdMapper),
      arg = my_opinion,
      toast = true,
    }
    for to, result in pairs(data.results) do
      if table.contains(targets, to) then
        if result.toCards then
          for _, id in ipairs(result.toCards) do
            local color = Fk:getCardById(id):getColorString()
            data.opinions[color] = (data.opinions[color] or 0) - 1
            data.opinions[my_opinion] = (data.opinions[my_opinion] or 0) + 1
          end
        else
          data.opinions[result.opinion] = (data.opinions[result.opinion] or 0) - 1
          data.opinions[my_opinion] = (data.opinions[my_opinion] or 0) + 1
        end
      end
    end
  end,
})

return bazheng
