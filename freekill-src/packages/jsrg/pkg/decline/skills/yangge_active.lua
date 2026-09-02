local yangge_active = fk.CreateSkill {
  name = "yangge&",
}

Fk:loadTranslationTable{
  ["yangge&"] = "扬戈",
  [":yangge&"] = "出牌阶段，若你体力值为最低，你可以对张奂发动〖密诏〗（其每轮限一次）。",

  ["#yangge"] = "扬戈：你可以对一名拥有“扬戈”的角色发动“密诏”",
}

yangge_active:addEffect("active", {
  mute = true,
  prompt = "#yangge",
  card_num = 0,
  target_num = 1,
  can_use = function(self, player)
    return not player:isKongcheng() and
      not table.find(Fk:currentRoom().alive_players, function(p)
        return p.hp < player.hp
      end) and
      table.find(Fk:currentRoom().alive_players, function(p)
        return p ~= player and p:hasSkill("yangge") and p:usedSkillTimes("yangge", Player.HistoryRound) == 0
      end)
  end,
  card_filter = Util.FalseFunc,
  target_filter = function(self, player, to_select, selected)
    return #selected == 0 and to_select ~= player and
      to_select:hasSkill("yangge") and to_select:usedSkillTimes("yangge", Player.HistoryRound) == 0
  end,
  on_use = function(self, room, effect)
    local player = effect.from
    local target = effect.tos[1]
    room:doIndicate(player, {target})
    target:broadcastSkillInvoke("yangge")
    room:notifySkillInvoked(target, "yangge", "support")
    target:addSkillUseHistory("yangge", 1)
    Fk.skills["mizhao"]:onUse(player.room, {
      from = player,
      cards = {},
      tos = {target},
    })
  end,
})

return yangge_active
