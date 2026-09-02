
local jushou = fk.CreateSkill({
  name = "jushou",
})

Fk:loadTranslationTable{
  ["jushou"] = "据守",
  [":jushou"] = "结束阶段，你可以摸三张牌，然后翻面。",

  ["$jushou1"] = "我先休息一会！",
  ["$jushou2"] = "尽管来吧！",
}

jushou:addEffect(fk.EventPhaseEnd, {
  anim_type = "defensive",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(jushou.name) and player.phase == Player.Finish
  end,
  on_use = function(self, event, target, player, data)
    player:drawCards(3, jushou.name)
    if not player.dead then
      player:turnOver()
    end
  end,
})

jushou:addAI(Fk.Ltk.AI.newInvokeStrategy{
  think = function(self, ai)
    return ai:getBenefitOfEvents(function(logic)
      logic:drawCards(ai.player, 3, self.skill_name)
      logic:setPlayerProperty(ai.player, "faceup", not ai.player.faceup)
    end) >= 0
  end,
})

return jushou
