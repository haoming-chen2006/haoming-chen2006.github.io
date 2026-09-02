local lianpo = fk.CreateSkill {
  name = "lianpo",
}

Fk:loadTranslationTable{
  ["lianpo"] = "连破",
  [":lianpo"] = "当你杀死一名角色后，你可以于此回合结束后获得一个额外回合。",

  ["$lianpo1"] = "受命于天，既寿永昌！",
  ["$lianpo2"] = "一鼓作气，破敌致胜！",
}

lianpo:addEffect(fk.TurnEnd, {
  anim_type = "offensive",
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(lianpo.name) and
      #player.room.logic:getEventsOfScope(GameEvent.Death, 1, function(e)
        return e.data.killer == player
      end, Player.HistoryTurn) > 0
  end,
  on_use = function(self, event, target, player, data)
    player:gainAnExtraTurn(true, lianpo.name)
  end,
})

lianpo:addAI(Fk.Ltk.AI.newInvokeStrategy{
  think = Util.TrueFunc,
})

return lianpo
