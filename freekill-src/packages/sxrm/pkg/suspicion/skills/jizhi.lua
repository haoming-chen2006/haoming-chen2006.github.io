local jizhi = fk.CreateSkill({
  name = "sx__jizhi",
  tags = { Skill.Compulsory },
})

Fk:loadTranslationTable{
  ["sx__jizhi"] = "赍志",
  [":sx__jizhi"] = "锁定技，其他角色不能对你使用【桃】；当你每回合首次进入濒死状态时，你回复1点体力。",
}

jizhi:addEffect(fk.EnterDying, {
  anim_type = "support",
  can_trigger = function(self, event, target, player, data)
    if target == player and player:hasSkill(jizhi.name) then
      local room = player.room
      local logic = room.logic
      local dying_event = logic:getCurrentEvent():findParent(GameEvent.Dying, true)
      if dying_event == nil then return false end
      local mark = player:getMark("sx__jizhi-turn")
      if mark == 0 then
        logic:getEventsOfScope(GameEvent.Dying, 1, function (e)
          local dying = e.data
          if dying.who == player then
            mark = e.id
            room:setPlayerMark(player, "sx__jizhi-turn", mark)
            return true
          end
        end, Player.HistoryTurn)
      end
      return mark == dying_event.id
    end
  end,
  on_use = function(self, event, target, player, data)
    player.room:recover {
      who = player,
      num = 1,
      recoverBy = player,
      skillName = jizhi.name,
    }
  end,
})

jizhi:addEffect("prohibit", {
  is_prohibited = function (self, from, to, card)
    return to:hasSkill(jizhi.name) and card and from ~= to and card.name == "peach"
  end,
})

return jizhi
