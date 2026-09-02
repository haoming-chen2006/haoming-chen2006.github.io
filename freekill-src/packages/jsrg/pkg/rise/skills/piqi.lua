local piqi = fk.CreateSkill {
  name = "piqi",
}

Fk:loadTranslationTable{
  ["piqi"] = "辟奇",
  [":piqi"] = "出牌阶段限两次，你可以视为使用一张无距离限制的【顺手牵羊】（两次目标不能为同一名角色），与目标距离1以内的角色本回合可以"..
  "将【闪】当【无懈可击】使用。",

  ["#piqi"] = "辟奇：视为使用一张无距离限制的【顺手牵羊】，与目标距离1以内的角色本回合可以将【闪】当【无懈可击】使用",
}

piqi:addEffect("viewas", {
  anim_type = "control",
  prompt = "#piqi",
  times = function(self, player)
    return player.phase == Player.Play and 2 - player:usedSkillTimes(piqi.name, Player.HistoryPhase) or -1
  end,
  card_filter = Util.FalseFunc,
  view_as = function(self, player, cards)
    local card = Fk:cloneCard("snatch")
    card.skillName = piqi.name
    return card
  end,
  before_use = function (self, player, use)
    local room = player.room
    local to = use.tos[1]
    room:addTableMark(player, "piqi-phase", to.id)
    for _, p in ipairs(room.alive_players) do
      if p:distanceTo(to) < 2 then
        room:handleAddLoseSkills(p, "piqi&", nil, false, true)
        room.logic:getCurrentEvent():findParent(GameEvent.Turn):addCleaner(function()
          room:handleAddLoseSkills(p, "-piqi&", nil, false, true)
        end)
      end
    end
  end,
  enabled_at_play = function (self, player)
    return player:usedSkillTimes(piqi.name, Player.HistoryPhase) < 2
  end,
})

piqi:addEffect("prohibit", {
  is_prohibited = function(self, from, to, card)
    return card and table.contains(card.skillNames, "piqi") and from and table.contains(from:getTableMark("piqi-phase"), to.id)
  end,
})

piqi:addEffect("targetmod", {
  bypass_distances = function(self, player, skill, card)
    return card and table.contains(card.skillNames, "piqi")
  end,
})

return piqi
