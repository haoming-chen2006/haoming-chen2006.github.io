local wuchang = fk.CreateSkill {
  name = "wuchang",
  tags = { Skill.Compulsory },
}

Fk:loadTranslationTable{
  ["wuchang"] = "无常",
  [":wuchang"] = "锁定技，当你得到其他角色的牌后，你变更势力至与其相同；当你使用【杀】或【决斗】对势力与你相同的角色造成伤害时，"..
  "你令此伤害+1，然后你变更势力至群。",
}

wuchang:addEffect(fk.AfterCardsMove, {
  anim_type = "special",
  can_trigger = function(self, event, target, player, data)
    if player:hasSkill(wuchang.name) then
      for _, move in ipairs(data) do
        if move.to == player and move.from and move.from ~= player and
          move.toArea == Card.PlayerHand and move.from.kingdom ~= player.kingdom then
          for _, info in ipairs(move.moveInfo) do
            if info.fromArea == Card.PlayerHand or info.fromArea == Card.PlayerEquip then
              return true
            end
          end
        end
      end
    end
  end,
  on_trigger = function (self, event, target, player, data)
    local kingdoms = {}
    for _, move in ipairs(data) do
      if move.to == player and move.from and move.from ~= player and
        move.toArea == Card.PlayerHand and move.from.kingdom ~= player.kingdom then
        if table.find(move.moveInfo, function (info)
          return info.fromArea == Card.PlayerHand or info.fromArea == Card.PlayerEquip
        end) then
          table.insert(kingdoms, move.from.kingdom)
        end
      end
    end
    for _, kingdom in ipairs(kingdoms) do
      if player:hasSkill(wuchang.name) and kingdom ~= player.kingdom then
        event:setCostData(self, {choice = kingdom})
        self:doCost(event, target, player, data)
      end
    end
  end,
  on_use = function(self, event, target, player, data)
    player.room:changeKingdom(player, event:getCostData(self).choice, true)
  end,
})

wuchang:addEffect(fk.DamageCaused, {
  anim_type = "offensive",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(wuchang.name) and
      data.card and table.contains({"slash", "duel"}, data.card.trueName) and player.kingdom == data.to.kingdom
  end,
  on_use = function(self, event, target, player, data)
    data:changeDamage(1)
    if player.kingdom ~= "qun" then
      player.room:changeKingdom(player, "qun", true)
    end
  end,
})

return wuchang
