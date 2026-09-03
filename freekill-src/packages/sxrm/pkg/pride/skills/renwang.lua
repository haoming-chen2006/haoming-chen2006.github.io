local renwang = fk.CreateSkill {
  name = "sx__renwang",
}

Fk:loadTranslationTable{
  ["sx__renwang"] = "仁王",
  [":sx__renwang"] = "每回合限一次，你可以将你的一张连接牌当【桃】使用。",

  ["#sx__renwang"] = "仁王：你可以将你的一张连接牌当【桃】使用",
}

local U = require "packages.utility.utility"

renwang:addEffect("viewas", {
  anim_type = "support",
  pattern = "peach",
  prompt = "#sx__renwang",
  card_filter = function(self, player, to_select, selected)
    return #selected == 0 and U.isConnectedCard(to_select)
  end,
  view_as = function(self, player, cards)
    if #cards ~= 1 then return end
    local c = Fk:cloneCard("peach")
    c.skillName = renwang.name
    c:addSubcard(cards[1])
    return c
  end,
  enabled_at_play = function(self, player)
    return player:usedSkillTimes(renwang.name) == 0
  end,
  enabled_at_response = function(self, player, response)
    return not response and player:usedSkillTimes(renwang.name) == 0
  end,
})

return renwang
