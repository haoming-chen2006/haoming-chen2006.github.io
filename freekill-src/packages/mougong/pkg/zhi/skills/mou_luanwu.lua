local mouLuanwu = fk.CreateSkill({
  name = "mou__luanwu",
  tags = { Skill.Limited },
})

Fk:loadTranslationTable{
  ["mou__luanwu"] = "乱武",
  [":mou__luanwu"] = "限定技，出牌阶段，你可以令所有其他角色依次选择一项：1.对距离最近的另一名其他角色使用一张【杀】；" ..
  "2.失去1点体力。每有一名角色因此失去体力时，你可以升级“完杀”或者“帷幕”（每个技能各限升级一次）。",
  ["#mou__luanwu"] = "令所有其他角色选择对最近角色出杀或掉血，若掉血你升级技能",
  ["#mou__luanwu-choice"] = "乱武：你可以升级“完杀”或者“帷幕”！",
  ["#mou__luanwu_delay"] = "乱武",

  ["$mou__luanwu1"] = "降则任人鱼肉，竭战或可保生！",
  ["$mou__luanwu2"] = "一将功成需万骨，何妨多添此一城！",
  ["$mou__luanwu3"] = "人之道，损不足以奉有余。",
  ["$mou__luanwu4"] = "寒烟起于朽木，白骨亦可生花。",
}

mouLuanwu:addEffect("active", {
  anim_type = "offensive",
  prompt = "#mou__luanwu",
  card_num = 0,
  target_num = 0,
  can_use = function(self, player)
    return player:usedSkillTimes(mouLuanwu.name, Player.HistoryGame) == 0
  end,
  card_filter = Util.FalseFunc,
  on_use = function(self, room, effect)
    ---@type string
    local skillName = mouLuanwu.name
    local player = effect.from
    local targets = room:getOtherPlayers(player)
    room:doIndicate(player, table.map(targets, Util.IdMapper))
    for _, target in ipairs(targets) do
      if target:isAlive() then
        local other_players = table.filter(room:getOtherPlayers(target, false), function(p)
          return not p:isRemoved() and p ~= player
        end)
        local luanwu_targets = table.map(table.filter(other_players, function(p2)
          return table.every(other_players, function(p1)
            return target:distanceTo(p1) >= target:distanceTo(p2)
          end)
        end), Util.IdMapper)
        local use = room:askToUseCard(
          target,
          {
            pattern = "slash",
            skill_name = skillName,
            prompt = "#luanwu-use",
            extra_data = { include_targets = luanwu_targets, bypass_times = true }
          }
        )
        if use then
          use.extraUse = true
          room:useCard(use)
        else
          room:loseHp(target, 1, skillName)
        end
      end
    end
  end,
})

mouLuanwu:addEffect(fk.HpLost, {
  is_delay_effect = true,
  mute = true,
  can_trigger = function(self, event, target, player, data)
    return
      data.skillName == "mou__luanwu" and
      player.phase == Player.Play and
      player:isAlive() and
      (
        (player:hasSkill("mou__wansha", true) and player:getMark("@@mou__wansha_upgrade") == 0) or
        (player:hasSkill("mou__weimu", true) and player:getMark("@@mou__weimu_upgrade") == 0)
      )
  end,
  on_cost = Util.TrueFunc,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local all_choices = { "mou__wansha", "mou__weimu" }
    local choices = table.filter(all_choices, function(name)
      return player:hasSkill(name, true) and player:getMark("@@" .. name .. "_upgrade") == 0
    end)
    table.insert(choices, "Cancel")
    table.insert(all_choices, "Cancel")
    local choice = room:askToChoice(
      player,
      {
        choices = choices,
        skill_name = mouLuanwu.name,
        prompt = "#mou__luanwu-choice",
        all_choices = all_choices
      }
    )
    if choice ~= "Cancel" then
      room:setPlayerMark(player, "@@" .. choice .. "_upgrade", 1)
    end
  end,
})

return mouLuanwu
