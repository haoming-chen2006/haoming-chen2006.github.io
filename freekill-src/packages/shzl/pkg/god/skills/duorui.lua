local duorui = fk.CreateSkill {
  name = "duorui",
}

Fk:loadTranslationTable{
  ["duorui"] = "夺锐",
  [":duorui"] = "当你于出牌阶段内对一名其他角色造成伤害后，你可以废除你的一个装备栏，然后选择该角色的武将牌上的一个技能"..
  "（限定技、觉醒技、使命技、主公技除外），令其于其下回合结束之前此技能无效，然后你于其下回合结束或其死亡之前拥有此技能且不能发动〖夺锐〗。",

  ["#duorui-choice"] = "夺锐：是否废除一个装备栏，夺取 %dest 一个技能？",
  ["#duorui-skill"] = "夺锐：选择%dest的一个技能令其无效，且你获得此技能",
  ["@duorui_source"] = "夺锐",
  ["@duorui_target"] = "被夺锐",

  ["$duorui1"] = "夺敌军锐气，杀敌方士气。",
  ["$duorui2"] = "尖锐之势，吾亦可一人夺之！",
}

duorui:addEffect(fk.Damage, {
  anim_type = "control",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(duorui.name) and
      player.phase == Player.Play and player:getMark("duorui_source") == 0 and
      #player:getAvailableEquipSlots() > 0 and data.to ~= player and not data.to.dead
  end,
  on_cost = function(self, event, target, player, data)
    local all_choices = {"WeaponSlot", "ArmorSlot", "DefensiveRideSlot", "OffensiveRideSlot", "TreasureSlot"}
    local subtypes = {Card.SubtypeWeapon, Card.SubtypeArmor, Card.SubtypeDefensiveRide, Card.SubtypeOffensiveRide, Card.SubtypeTreasure}
    local choices = {}
    for i = 1, 5, 1 do
      if #player:getAvailableEquipSlots(subtypes[i]) > 0 then
        table.insert(choices, all_choices[i])
      end
    end
    table.insert(all_choices, "Cancel")
    table.insert(choices, "Cancel")
    local choice = player.room:askToChoice(player, {
      choices = choices,
      skill_name = duorui.name,
      prompt = "#duorui-choice::"..data.to.id,
      all_choices = all_choices,
    })
    if choice ~= "Cancel" then
      event:setCostData(self, {tos = {data.to}, choice = choice})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    room:abortPlayerArea(player, {event:getCostData(self).choice})
    local target = data.to
    if player.dead or target.dead then return end
    local skills = {}
    local ban_types = {Skill.Limited, Skill.Wake, Skill.Quest, Skill.Lord}
    for _, skill_name in ipairs(Fk.generals[target.general]:getSkillNameList()) do
      local skill = Fk.skills[skill_name]
      if not table.find(ban_types, function (tag)
        return skill:hasTag(tag)
      end) then
        table.insertIfNeed(skills, skill_name)
      end
    end
    if target.deputyGeneral and target.deputyGeneral ~= "" then
      for _, skill_name in ipairs(Fk.generals[target.deputyGeneral]:getSkillNameList()) do
        local skill = Fk.skills[skill_name]
        if not table.find(ban_types, function (tag)
          return skill:hasTag(tag)
        end) then
          table.insertIfNeed(skills, skill_name)
        end
      end
    end
    if #skills == 0 then return false end
    local choice = room:askToChoice(player, {
      choices = skills,
      skill_name = duorui.name,
      prompt = "#duorui-skill::" .. data.to.id,
      detailed = true,
    })
    room:addTableMark(target, "duorui_target", choice)
    room:setPlayerMark(target, "@duorui_target", choice)
    if player:hasSkill(choice, true) then return false end
    room:addTableMark(player, "duorui_source", {target.id, choice})
    room:setPlayerMark(player, "@duorui_source", choice)
    room:handleAddLoseSkills(player, choice, nil, true, true)
  end,
})
duorui:addEffect("invalidity", {
  invalidity_func = function(self, from, skill)
    return table.contains(from:getTableMark("duorui_target"), skill.name)
  end,
})

local clean_spec = {
  can_refresh = Util.TrueFunc,
  on_refresh = function(self, event, target, player, data)
    local room = player.room
    if player == target then
      room:setPlayerMark(player, "duorui_target", 0)
      room:setPlayerMark(player, "@duorui_target", 0)
    end
    local mark = player:getMark("duorui_source")
    if type(mark) ~= "table" then return false end
    local clear_skills = {}
    local mark2 = {}
    for _, duorui_info in ipairs(mark) do
      if duorui_info[1] == target.id then
        table.insertIfNeed(clear_skills, duorui_info[2])
      else
        table.insertIfNeed(mark2, duorui_info)
      end
    end
    if #clear_skills > 0 then
      if #mark2 > 0 then
        room:setPlayerMark(player, "duorui_source", mark2)
        room:setPlayerMark(player, "@duorui_source", mark2[#mark2][2])
      else
        room:setPlayerMark(player, "duorui_source", 0)
        room:setPlayerMark(player, "@duorui_source", 0)
      end
      room:handleAddLoseSkills(player, "-"..table.concat(clear_skills, "|-"), nil, true, false)
    end
  end,
}
duorui:addEffect(fk.TurnEnd, {
  late_refresh = true,
  can_refresh = clean_spec.can_refresh,
  on_refresh = clean_spec.on_refresh,
})
duorui:addEffect(fk.BuryVictim, clean_spec)

return duorui
