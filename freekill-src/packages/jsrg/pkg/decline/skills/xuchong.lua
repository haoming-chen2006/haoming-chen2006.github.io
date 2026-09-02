local xuchong = fk.CreateSkill {
  name = "xuchong"
}

Fk:loadTranslationTable{
  ["xuchong"] = "虚宠",
  [":xuchong"] = "当你成为牌的目标后，你可以选择一项：1.摸一张牌；2.令当前回合角色本回合手牌上限+2。然后你获得一张【影】。",

  ["xuchong_max"] = "%dest本回合手牌上限+2",
  ["#xuchong-invoke"] = "虚宠：选择执行一项并获得一张【影】",
}

local U = require "packages.utility.utility"

xuchong:addEffect(fk.TargetConfirmed, {
  anim_type = "drawcard",
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local choice = room:askToChoice(player, {
      choices = { "draw1", "xuchong_max::"..room.current.id, "Cancel" },
      skill_name = xuchong.name,
      prompt = "#xuchong-invoke",
    })
    if choice ~= "Cancel" then
      event:setCostData(self, {tos = choice == "draw1" and {} or {room.current}, choice = choice})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    if event:getCostData(self).choice == "draw1" then
      player:drawCards(1, xuchong.name)
      if player.dead then return end
    else
      room:addPlayerMark(room.current, MarkEnum.AddMaxCardsInTurn, 2)
    end
    room:moveCards({
      ids = U.getShade(room, 1),
      to = player,
      toArea = Card.PlayerHand,
      moveReason = fk.ReasonJustMove,
      proposer = player,
      skill_name = xuchong.name,
      moveVisible = true,
    })
  end,
})

return xuchong
