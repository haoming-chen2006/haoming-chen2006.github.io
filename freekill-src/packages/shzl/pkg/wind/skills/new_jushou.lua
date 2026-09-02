local jushou = fk.CreateSkill({
  name = "y13__jushou",
})

Fk:loadTranslationTable{
  ["y13__jushou"] = "据守",
  [":y13__jushou"] = "结束阶段，你可以摸一张牌并翻面。",

  ["$y13__jushou1"] = "坚守勿出，严阵以待。",
  ["$y13__jushou2"] = "以静制动，以逸待劳。",
}

jushou:addEffect(fk.EventPhaseEnd, {
  anim_type = "defensive",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(jushou.name) and player.phase == Player.Finish
  end,
  on_use = function(self, event, target, player, data)
    player:drawCards(1, jushou.name)
    if not player.dead then
      player:turnOver()
    end
  end,
})

jushou:addAI(Fk.Ltk.AI.newInvokeStrategy{
  think = function(self, ai)
    return ai:getBenefitOfEvents(function(logic)
      logic:drawCards(ai.player, 1, self.skill_name)
      logic:setPlayerProperty(ai.player, "faceup", not ai.player.faceup)
    end) >= 0
  end,
})

return jushou
