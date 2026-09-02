local wuqian = fk.CreateSkill {
  name = "wuqian",
  related_skills = { "wushuang" },
}

Fk:loadTranslationTable{
  ["wuqian"] = "无前",
  [":wuqian"] = "出牌阶段，你可以弃2枚“暴怒”并选择一名此回合内未以此法选择过的其他角色，你于此回合内拥有〖无双〗且其防具技能于此回合内无效。",

  ["@@wuqian-turn"] = "无前",
  ["#wuqian"] = "无前：弃2枚暴怒，令一名角色的防具无效，且本回合你获得〖无双〗",

  ["$wuqian1"] = "看我神威，无坚不摧！",
  ["$wuqian2"] = "天王老子也保不住你！",
}

wuqian:addEffect("active", {
  anim_type = "offensive",
  prompt = "#wuqian",
  can_use = function(self, player)
    return player:getMark("@baonu") > 1
  end,
  card_num = 0,
  target_num = 1,
  target_filter = function(self, player, to_select, selected)
    return #selected < 1 and to_select ~= player and to_select:getMark("@@wuqian-turn") == 0
  end,
  card_filter = Util.FalseFunc,
  on_use = function(self, room, effect)
    local player = effect.from
    local target = effect.tos[1]
    room:removePlayerMark(player, "@baonu", 2)
    room:addPlayerMark(target, "@@wuqian-turn")
    room:handleAddLoseSkills(player, "wushuang", nil, true, false)
    room:addPlayerMark(target, MarkEnum.MarkArmorNullified)
  end
})
wuqian:addEffect(fk.TurnEnd, {
  late_refresh = true,
  can_refresh = function(self, event, target, player, data)
    return target == player and player:usedSkillTimes(wuqian.name) > 0
  end,
  on_refresh = function(self, event, target, player, data)
    local room = player.room
    room:handleAddLoseSkills(player, "-wushuang", nil, true, false)
    for _, p in ipairs(room.alive_players) do
      if p:getMark("@@wuqian-turn") > 0 then
        room:removePlayerMark(p, MarkEnum.MarkArmorNullified)
      end
    end
  end,
})

return wuqian
