local fumou = fk.CreateSkill {
  name = "js__fumou",
  tags = { Skill.AttachedKingdom },
  attached_kingdom = {"wei"},
}

Fk:loadTranslationTable{
  ["js__fumou"] = "复谋",
  [":js__fumou"] = "魏势力技，当你参与的议事结束后，所有与你意见不同的角色本回合内不能使用或打出其意见颜色的牌，然后你可以将一张【影】"..
  "当【出其不意】对其中一名角色使用。",

  ["@js__fumou-turn"] = "复谋",
  ["#js__fumou-use"] = "复谋：你可以将一张【影】当【出其不意】对其中一名角色使用",
}

local U = require "packages.utility.utility"

fumou:addEffect(U.DiscussionFinished, {
  can_trigger = function(self, event, target, player, data)
    if player:hasSkill(fumou.name) and data.results[player] then
      for p, result in pairs(data.results) do
        if not p.dead and result.opinion ~= data.results[player].opinion then
          return true
        end
      end
    end
  end,
  on_cost = Util.TrueFunc,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local targets = {}
    for p, result in pairs(data.results) do
      if not p.dead and result.opinion ~= data.results[player].opinion then
        if result.opinion ~= "nocolor" then
          room:addTableMarkIfNeed(p, "@js__fumou-turn", result.opinion)
        end
        table.insert(targets, p)
      end
    end
    room:doIndicate(player, targets)
    room:askToUseVirtualCard(player, {
      name = "unexpectation",
      skill_name = fumou.name,
      prompt = "#js__fumou-use",
      cancelable = true,
      extra_data = {
        exclusive_targets = table.map(targets, Util.IdMapper),
      },
      card_filter = {
        n = 1,
        pattern = "shade",
      }
    })
  end,
})

fumou:addEffect("prohibit", {
  prohibit_use = function(self, player, card)
    return card and table.contains(player:getTableMark("@js__fumou-turn"), card:getColorString())
  end,
  prohibit_response = function(self, player, card)
    return card and table.contains(player:getTableMark("@js__fumou-turn"), card:getColorString())
  end,
})

return fumou
