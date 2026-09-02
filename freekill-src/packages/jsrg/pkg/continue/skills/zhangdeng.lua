local zhangdeng = fk.CreateSkill {
  name = "zhangdeng",
  attached_skill_name = "zhangdeng&"
}

Fk:loadTranslationTable{
  ["zhangdeng"] = "帐灯",
  [":zhangdeng"] = "当一名武将牌背面朝上的角色需要使用【酒】时，若你的武将牌背面朝上，其可以视为使用之。当本技能于一回合内不为第一次发动时，"..
  "你翻面至正面朝上。",

  ["#zhangdeng"] = "帐灯：你可以视为使用【酒】",
  ["#zhangdeng-choose"] = "帐灯：要发动哪位角色的“帐灯”？若为不为第一次发动，其翻面至正面朝上",
  ["#zhangdeng_tip"] = "翻至正面",
}

Fk:addTargetTip{
  name = "zhangdeng",
  target_tip = function(self, player, to_select, selected, selected_cards, card, selectable)
    if not selectable then return end
    if to_select:usedSkillTimes(zhangdeng.name, Player.HistoryTurn) > 0 then
      return "#zhangdeng_tip"
    end
  end,
}

zhangdeng:addEffect("viewas", {
  mute = true,
  pattern = "analeptic",
  prompt = "#zhangdeng",
  card_filter = Util.FalseFunc,
  view_as = function(self, player, cards)
    local c = Fk:cloneCard("analeptic")
    c.skillName = zhangdeng.name
    return c
  end,
  before_use = function(self, player, use)
    local room = player.room
    local src = table.filter(room.alive_players, function (p)
      return p:hasSkill(zhangdeng.name) and not p.faceup
    end)
    if #src > 1 then
      src = room:askToChoosePlayers(player, {
        min_num = 1,
        max_num = 1,
        targets = src,
        skill_name = zhangdeng.name,
        prompt = "#zhangdeng-choose",
        cancelable = false,
        target_tip_name = zhangdeng.name,
      })
    end
    src = src[1]
    src:broadcastSkillInvoke(zhangdeng.name)
    room:notifySkillInvoked(src, zhangdeng.name, "support", {player})
    if src:usedSkillTimes(zhangdeng.name, Player.HistoryTurn) > 1 and not src.faceup then
      src:turnOver()
    end
  end,
  enabled_at_play = function (self, player)
    return table.find(Fk:currentRoom().alive_players, function (p)
      return p:hasSkill(zhangdeng.name) and not p.faceup
    end)
  end,
  enabled_at_response = function (self, player, response)
    return not response and table.find(Fk:currentRoom().alive_players, function (p)
      return p:hasSkill(zhangdeng.name) and not p.faceup
    end)
  end,
})

return zhangdeng
