local renjie = fk.CreateSkill {
  name = "renjie",
  tags = { Skill.Compulsory },
}

Fk:loadTranslationTable{
  ["renjie"] = "忍戒",
  [":renjie"] = "锁定技，当你受到伤害后/于弃牌阶段弃置手牌后，你获得X枚“忍”（X为伤害值/你弃置的手牌数）。",

  ["@godsimayi_bear"] = "忍",

  ["$renjie1"] = "忍一时，风平浪静。",
  ["$renjie2"] = "退一步，海阔天空。",
}

renjie:addLoseEffect(function (self, player)
  player.room:setPlayerMark(player, "@godsimayi_bear", 0)
end)
renjie:addEffect(fk.Damaged, {
  anim_type = "masochism",
  on_use = function(self, event, target, player, data)
    player.room:addPlayerMark(player, "@godsimayi_bear", data.damage)
  end,
})
renjie:addEffect(fk.AfterCardsMove, {
  can_trigger = function(self, event, target, player, data)
    if player:hasSkill(renjie.name) and player.phase == Player.Discard then
      for _, move in ipairs(data) do
        if move.from == player and move.moveReason == fk.ReasonDiscard then
          for _, info in ipairs(move.moveInfo) do
            if info.fromArea == Card.PlayerHand then
              return true
            end
          end
        end
      end
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local n = 0
    for _, move in ipairs(data) do
      if move.from == player and move.moveReason == fk.ReasonDiscard then
        for _, info in ipairs(move.moveInfo) do
          if info.fromArea == Card.PlayerHand then
            n = n + 1
          end
        end
      end
    end
    room:addPlayerMark(player, "@godsimayi_bear", n)
  end,
})

return renjie
