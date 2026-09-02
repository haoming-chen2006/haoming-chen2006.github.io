local kuizhu = fk.CreateSkill {
  name = "kuizhu",
}

Fk:loadTranslationTable{
  ["kuizhu"] = "溃诛",
  [":kuizhu"] = "弃牌阶段结束时，你可以选择一项：1.令至多X名角色各摸一张牌；2.对任意名体力值之和为X的角色造成1点伤害，若不少于2名角色，"..
  "你失去1点体力（X为你此阶段弃置的牌数）。",

  ["#kuizhu-invoke"] = "溃诛：你可以选择一项",
  ["kuizhu_choice1"] = "令至多%arg名角色各摸一张牌",
  ["kuizhu_choice2"] = "对任意名体力值之和为%arg的角色造成1点伤害",

  ["$kuizhu1"] = "子通专恣，必谋而诛之！",
  ["$kuizhu2"] = "孙綝久专，不可久忍，必溃诛！",
}

kuizhu:addEffect(fk.EventPhaseEnd, {
  mute = true,
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(kuizhu.name) and player.phase == Player.Discard and
      #player.room.logic:getEventsOfScope(GameEvent.MoveCards, 1, function(e)
        for _, move in ipairs(e.data) do
          if move.from == player and move.toArea == Card.DiscardPile and move.moveReason == fk.ReasonDiscard then
            return true
          end
        end
      end, Player.HistoryPhase) > 0
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local n = 0
    room.logic:getEventsOfScope(GameEvent.MoveCards, 1, function(e)
      for _, move in ipairs(e.data) do
        if move.from == player and move.toArea == Card.DiscardPile and move.moveReason == fk.ReasonDiscard then
          n = n + #move.moveInfo
        end
      end
    end, Player.HistoryPhase)
    local success, dat = room:askToUseActiveSkill(player, {
      skill_name = "kuizhu_active",
      prompt = "#kuizhu-invoke",
      cancelable = true,
      extra_data = {
        num = n,
      }
    })
    if success and dat then
      local tos = dat.targets
      room:sortByAction(tos)
      event:setCostData(self, {tos = tos, choice = dat.interaction})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    player:broadcastSkillInvoke(kuizhu.name)
    local targets = event:getCostData(self).tos
    local choice = event:getCostData(self).choice
    room:doIndicate(player, targets)
    if choice:startsWith("kuizhu_choice1") then
      room:notifySkillInvoked(player, kuizhu.name, "support")
      for _, p in ipairs(targets) do
        if not p.dead then
          p:drawCards(1, kuizhu.name)
        end
      end
    else
      room:notifySkillInvoked(player, kuizhu.name, "offensive")
      for _, p in ipairs(targets) do
        if not p.dead then
          room:damage {
            from = player,
            to = p,
            damage = 1,
            skillName = kuizhu.name,
          }
        end
      end
      if not player.dead and #targets >= 2 then
        room:loseHp(player, 1, kuizhu.name)
      end
    end
  end,
})

return kuizhu
