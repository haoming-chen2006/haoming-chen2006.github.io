local zhangdeng_viewas = fk.CreateSkill {
  name = "zhangdeng&",
}

Fk:loadTranslationTable{
  ["zhangdeng&"] = "帐灯",
  [":zhangdeng&"] = "当你需要使用【酒】时，若你与邹氏的武将牌均为背面朝上，你可以视为使用之。",
}

zhangdeng_viewas:addEffect("viewas", {
  mute = true,
  pattern = "analeptic",
  prompt = "#zhangdeng",
  card_filter = Util.FalseFunc,
  view_as = function(self, player, cards)
    local c = Fk:cloneCard("analeptic")
    c.skillName = "zhangdeng"
    return c
  end,
  before_use = function(self, player, use)
    local room = player.room
    local src = table.filter(room.alive_players, function (p)
      return p:hasSkill("zhangdeng") and not p.faceup
    end)
    if #src > 1 then
      src = room:askToChoosePlayers(player, {
        min_num = 1,
        max_num = 1,
        targets = src,
        skill_name = "zhangdeng",
        prompt = "#zhangdeng-choose",
        cancelable = false,
        target_tip_name = "zhangdeng",
      })
    end
    src = src[1]
    src:broadcastSkillInvoke("zhangdeng")
    room:notifySkillInvoked(src, "zhangdeng", "support", {player})
    src:addSkillUseHistory("zhangdeng", 1)
    if src:usedSkillTimes("zhangdeng", Player.HistoryTurn) > 1 and not src.faceup then
      src:turnOver()
    end
  end,
  enabled_at_play = function (self, player)
    return not player.faceup and
      table.find(Fk:currentRoom().alive_players, function (p)
        return p:hasSkill("zhangdeng") and not p.faceup
      end)
  end,
  enabled_at_response = function (self, player, response)
    return not response and
    not player.faceup and
    table.find(Fk:currentRoom().alive_players, function (p)
      return p:hasSkill("zhangdeng") and not p.faceup
    end)
  end,
})

return zhangdeng_viewas
