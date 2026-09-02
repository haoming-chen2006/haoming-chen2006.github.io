local mouJiefan = fk.CreateSkill({
  name = "mou__jiefan",
})

Fk:loadTranslationTable{
  ["mou__jiefan"] = "解烦",
  [":mou__jiefan"] = "出牌阶段限一次，你可以令一名角色选择一项：1.令攻击范围内含有其的角色依次弃置一张牌；" ..
  "2.其摸攻击范围内含有其的角色数张牌；背水：此技能失效直到你杀死其他角色。",
  ["mou__jiefan_discard"] = "令攻击范围内含有你的角色依次弃置一张牌",
  ["mou__jiefan_draw"] = "摸%arg张牌",
  ["@@mou__jiefan_nullified"] = "解烦失效",

  ["$mou__jiefan1"] = "一箭可解之事，何使公忧烦至此。",
  ["$mou__jiefan2"] = "贼盛不足惧，有吾解烦营。",
}

mouJiefan:addEffect("active", {
  anim_type = "control",
  card_num = 0,
  target_num = 1,
  can_use = function(self, player)
    return player:usedSkillTimes(mouJiefan.name, Player.HistoryPhase) == 0
  end,
  card_filter = Util.FalseFunc,
  target_filter = function(self, player, to_select, selected)
    return #selected == 0
  end,
  on_use = function(self, room, effect)
    local target = effect.tos[1]
    local others = table.filter(room:getOtherPlayers(target), function(p) return p:inMyAttackRange(target) end)
    if #others == 0 then
      return
    end

    ---@type string
    local skillName = mouJiefan.name
    local choice = room:askToChoice(
      target,
      {
        choices = { "beishui", "mou__jiefan_discard", "mou__jiefan_draw:::" .. #others },
        skill_name = skillName
      }
    )
    if choice == "beishui" then
      room:invalidateSkill(effect.from, skillName)
    end

    if choice == "beishui" or choice == "mou__jiefan_discard" then
      for _, p in ipairs(others) do
        room:askToDiscard(p, { min_num = 1, max_num = 1, include_equip = true, skill_name = skillName, cancelable = false })
      end
    end

    if choice == "beishui" or choice:startsWith("mou__jiefan_draw") then
      target:drawCards(#others, self.name)
    end
  end,
})

mouJiefan:addEffect(fk.Deathed, {
  can_refresh = function(self, event, target, player, data)
    return
      target ~= player and
      data.damage and
      data.damage.from == player and
      player:getTableMark(MarkEnum.InvalidSkills)["mou__jiefan"]
  end,
  on_refresh = function(self, event, target, player, data)
    player.room:validateSkill(player, "mou__jiefan")
  end,
})

return mouJiefan
