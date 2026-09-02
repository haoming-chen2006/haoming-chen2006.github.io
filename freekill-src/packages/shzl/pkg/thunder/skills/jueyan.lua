local jueyan = fk.CreateSkill {
  name = "jueyan",
  related_skills = { "ex__jizhi" },
}

Fk:loadTranslationTable{
  ["jueyan"] = "决堰",
  [":jueyan"] = "出牌阶段限一次，你可以废除你装备区里的一种装备栏，然后执行对应的一项：武器栏，你于此回合内可以多使用三张【杀】；"..
  "防具栏，摸三张牌，本回合手牌上限+3；坐骑栏，本回合你使用牌无距离限制；宝物栏，本回合获得〖集智〗。",

  ["RideSlot"] = "坐骑栏",
  ["#jueyan"] = "决堰：你可废除你装备区里的一种装备栏，执行对应效果",

  ["$jueyan1"] = "毁堰坝之计，实为阻晋粮道。",
  ["$jueyan2"] = "堰坝毁之，可令敌军自退。",
}

jueyan:addEffect("active", {
  prompt = "#jueyan",
  can_use = function (self, player)
    return #player:getAvailableEquipSlots() > 0 and player:usedSkillTimes(jueyan.name, Player.HistoryPhase) == 0
  end,
  card_num = 0,
  target_num = 0,
  interaction = function(self, player)
    local choices = {}
    for _, slot in ipairs(player:getAvailableEquipSlots()) do
      if slot == Player.OffensiveRideSlot or slot == Player.DefensiveRideSlot then
        table.insertIfNeed(choices, "RideSlot")
      else
        table.insert(choices, slot)
      end
    end
    return UI.OptionBox {
      options = choices,
      all_options = { "WeaponSlot", "ArmorSlot", "RideSlot", "TreasureSlot" },
      direct_send = true,
    }
  end,
  card_filter = Util.FalseFunc,
  on_use = function(self, room, effect)
    local player = effect.from
    local choice = effect.interaction_data ---@type string
    local tempChoice = { choice }
    if choice == "RideSlot" then
      tempChoice = { Player.OffensiveRideSlot, Player.DefensiveRideSlot }
    end

    local slots = {}
    table.forEach(tempChoice, function(slot)
      local subtype = Util.convertSubtypeAndEquipSlot(slot)
      table.insertTable(slots, player:getAvailableEquipSlots(subtype))
    end)
    room:abortPlayerArea(player, slots)
    if player.dead then return end
    if choice == "WeaponSlot" then
      room:addPlayerMark(player, MarkEnum.SlashResidue.."-turn", 3)
    elseif choice == "ArmorSlot" then
      room:addPlayerMark(player, MarkEnum.AddMaxCardsInTurn, 3)
      player:drawCards(3, jueyan.name)
    elseif choice == "TreasureSlot" then
      if not player:hasSkill("ex__jizhi",true) then
        room:handleAddLoseSkills(player, "ex__jizhi", nil, true, false)
        room.logic:getCurrentEvent():findParent(GameEvent.Turn):addCleaner(function()
          room:handleAddLoseSkills(player, "-ex__jizhi", nil, true, false)
        end)
      end
    else
      room:addPlayerMark(player, "jueyan_distance-turn")
    end
  end,
})
jueyan:addEffect("targetmod", {
  bypass_distances = function(self, player, skill, card)
    return card and player:getMark("jueyan_distance-turn") > 0
  end,
})

return jueyan
