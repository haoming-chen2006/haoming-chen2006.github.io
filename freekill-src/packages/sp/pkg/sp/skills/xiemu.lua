local xiemu = fk.CreateSkill {
  name = "xiemu",
}

Fk:loadTranslationTable{
  ["xiemu"] = "协穆",
  [":xiemu"] = "出牌阶段限一次，你可以弃置一张【杀】并选择一个势力，直到你的下回合开始，该势力的其他角色使用黑色牌指定你为目标后，你可以摸两张牌。",

  ["#xiemu"] = "协穆：弃一张【杀】并选择一个势力，直到你下回合，该势力角色使用黑色牌指定你为目标后，你摸两张牌",
  ["@xiemu"] = "协穆",

  ["$xiemu1"] = "休要再起战事。",
  ["$xiemu2"] = "暴戾之气，伤人害己。",
}

xiemu:addEffect("active", {
  anim_type = "control",
  prompt = "#xiemu",
  interaction = function (self, player)
    local choices = {}
    for _, p in ipairs(Fk:currentRoom().alive_players) do
      if p.kingdom == "wild" then
        table.insertIfNeed(choices, p.role)
      else
        table.insertIfNeed(choices, p.kingdom)
      end
    end
    return UI.ComboBox { choices = choices }
  end,
  card_num = 1,
  target_num = 0,
  can_use = function(self, player)
    return player:usedSkillTimes(xiemu.name) == 0
  end,
  card_filter = function(self, player, to_select, selected)
    return #selected == 0 and Fk:getCardById(to_select).trueName == "slash" and not player:prohibitDiscard(to_select)
  end,
  on_use = function(self, room, effect)
    local player = effect.from
    room:addTableMarkIfNeed(player, "@xiemu", self.interaction.data)
    room:throwCard(effect.cards, xiemu.name, player, player)
  end,
})

xiemu:addEffect(fk.TargetConfirmed, {
  anim_type = "drawcard",
  can_trigger = function(self, event, target, player, data)
    return target == player and not player.dead and
      data.from ~= player and data.card.color == Card.Black and
      table.contains(player:getTableMark("@xiemu"), data.from.kingdom == "wild" and data.from.role or data.from.kingdom)
  end,
  on_use = function(self, event, target, player, data)
    player:drawCards(2, xiemu.name)
  end,
})

xiemu:addEffect(fk.TurnStart, {
  can_refresh = function(self, event, target, player, data)
    return target == player and player:getMark("@xiemu") ~= 0
  end,
  on_refresh = function(self, event, target, player, data)
    player.room:setPlayerMark(player, "@xiemu", 0)
  end,
})

return xiemu
