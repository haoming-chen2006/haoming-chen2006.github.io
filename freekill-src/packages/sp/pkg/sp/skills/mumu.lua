local mumu = fk.CreateSkill {
  name = "mumu",
}

Fk:loadTranslationTable{
  ["mumu"] = "穆穆",
  [":mumu"] = "若你于出牌阶段内未造成伤害，则此回合的结束阶段开始时，你可以选择一项：1.弃置场上一张武器牌，然后摸一张牌；"..
  "2.将场上一张防具牌移动到你的装备区里（可替换原防具）。",

  ["#mumu-invoke"] = "穆穆：你可以执行一项",
  ["mumu_weapon"] = "弃置场上一张武器牌，摸一张牌",
  ["mumu_armor"] = "将一张防具移至你的装备区",

  ["$mumu1"] = "立储乃国家大事，我们姐妹不便参与。",
  ["$mumu2"] = "只求相夫教子，不求参政议事。",
}

mumu:addEffect(fk.EventPhaseStart, {
  anim_type = "control",
  can_trigger = function(self, event, target, player, data)
    if target == player and player:hasSkill(mumu.name) and player.phase == Player.Finish then
      local yes = false
      local phase_ids = {}
      player.room.logic:getEventsOfScope(GameEvent.Phase, 1, function (e)
        if e.data.phase == Player.Play and e.end_id then
          table.insert(phase_ids, {e.id, e.end_id})
        end
      end, Player.HistoryTurn)
      if #phase_ids == 0 then
        yes = true
      elseif #player.room.logic:getActualDamageEvents(1, function(e)
        if e.data.from == player then
          for _, ids in ipairs(phase_ids) do
            if e.id > ids[1] and e.id < ids[2] then
              return true
            end
          end
        end
        end) == 0 then
        yes = true
      end
      if yes then
        return table.find(player.room.alive_players, function (p)
          return #p:getEquipments(Card.SubtypeWeapon) > 0
        end) or
        (table.find(player.room:getOtherPlayers(player, false), function (p)
          return #p:getEquipments(Card.SubtypeArmor) > 0
        end) and
        #player:getAvailableEquipSlots(Card.SubtypeArmor) > 0)
      end
    end
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local success, dat = room:askToUseActiveSkill(player, {
      skill_name = "mumu_active",
      prompt = "#mumu-invoke",
      cancelable = true,
    })
    if success and dat then
      event:setCostData(self, {tos = dat.targets, choice = dat.interaction})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local to = event:getCostData(self).tos[1]
    local choice = event:getCostData(self).choice
    if choice == "mumu_weapon" then
      local cards = to:getEquipments(Card.SubtypeWeapon)
      if #cards > 1 then
        cards = room:askToChooseCard(player, {
          target = to,
          flag = { card_data = cards },
          skill_name = mumu.name,
        })
      end
      room:throwCard(cards, mumu.name, to, player)
      if not player.dead then
        player:drawCards(1, mumu.name)
      end
    else
      local cards = to:getEquipments(Card.SubtypeArmor)
      if #cards > 1 then
        cards = room:askToChooseCard(player, {
          target = to,
          flag = { card_data = cards },
          skill_name = mumu.name,
        })
      end
      room:moveCardIntoEquip(player, cards, mumu.name, true, player)
    end
  end,
})

return mumu
