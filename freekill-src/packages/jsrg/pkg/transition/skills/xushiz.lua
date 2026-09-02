local xushiz = fk.CreateSkill {
  name = "xushiz",
}

Fk:loadTranslationTable{
  ["xushiz"] = "虚势",
  [":xushiz"] = "出牌阶段限一次，你可以交给任意名角色各一张牌，然后你获得两倍数量的【影】。",

  ["#xushiz"] = "虚势：交给任意名角色各一张牌，获得两倍数量的【影】",
}

local U = require "packages.utility.utility"

xushiz:addEffect("active", {
  anim_type = "drawcard",
  prompt = "#xushiz",
  can_use = function(self, player)
    return player:usedSkillTimes(xushiz.name, Player.HistoryPhase) == 0 and
      #Fk:currentRoom().alive_players > 1
  end,
  card_filter = Util.FalseFunc,
  target_filter = Util.FalseFunc,
  card_num = 0,
  target_num = 0,
  on_use = function(self, room, effect)
    local player = effect.from
    local result = room:askToYiji(player, {
      cards = player:getCardIds("he"),
      targets = room:getOtherPlayers(player, false),
      skill_name = xushiz.name,
      min_num = 1,
      max_num = 9,
      prompt = "#xushiz",
      single_max = 1,
    })
    if player.dead then return end
    local n = 0
    for _, value in pairs(result) do
      if #value > 0 then
        n = n + 2
      end
    end
    room:moveCards({
      ids = U.getShade(room, n),
      to = player,
      toArea = Card.PlayerHand,
      moveReason = fk.ReasonJustMove,
      proposer = player,
      skillName = xushiz.name,
      moveVisible = true,
    })
  end,
})

return xushiz
