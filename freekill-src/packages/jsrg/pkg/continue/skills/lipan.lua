local lipan = fk.CreateSkill {
  name = "lipan",
}

Fk:loadTranslationTable{
  ["lipan"] = "离叛",
  [":lipan"] = "结束阶段结束时，你可以变更势力，然后摸X张牌并执行一个额外的出牌阶段（X为势力与你相同的其他角色数）。此阶段结束时，"..
  "所有势力与你相同的其他角色可以将一张牌当【决斗】对你使用。",

  ["#lipan-invoke"] = "离叛：你可以改变势力并摸牌，然后执行一个出牌阶段",
  ["#lipan-duel"] = "离叛：你可以将一张牌当【决斗】对 %dest 使用",
}

lipan:addEffect(fk.EventPhaseEnd, {
  anim_type = "drawcard",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(lipan.name) and player.phase == Player.Finish
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local all_choices = Fk:getKingdomMap("god")
    table.insert(all_choices, "Cancel")
    local choices = table.simpleClone(all_choices)
    table.removeOne(choices, player.kingdom)
    local choice = room:askToChoice(player, {
      choices = choices,
      skill_name = lipan.name,
      prompt = "#lipan-invoke",
      all_choices = all_choices,
    })
    if choice ~= "Cancel" then
      event:setCostData(self, {choice = choice})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    room:changeKingdom(player, event:getCostData(self).choice, true)
    local n = #table.filter(room:getOtherPlayers(player, false), function(p)
      return p.kingdom == player.kingdom
    end)
    if n > 0 then
      player:drawCards(n, lipan.name)
    end
    if not player.dead then
      player:gainAnExtraPhase(Player.Play, lipan.name)
    end
  end,
})

lipan:addEffect(fk.EventPhaseEnd, {
  anim_type = "negative",
  is_delay_effect = true,
  can_trigger = function(self, event, target, player, data)
    return target == player and player.phase == Player.Play and data.reason == lipan.name and not player.dead and
      table.find(player.room:getOtherPlayers(player, false), function(p)
        return p.kingdom == player.kingdom and (not p:isNude() or #p:getHandlyIds() > 0)
      end)
  end,
  on_cost = function (self, event, target, player, data)
    local room = player.room
    local tos = table.filter(room:getOtherPlayers(player, false), function(p)
      return p.kingdom == player.kingdom
    end)
    room:sortByAction(tos)
    event:setCostData(self, {tos = tos})
    return true
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    for _, p in ipairs(event:getCostData(self).tos) do
      if player.dead then return end
      if not p.dead and p.kingdom == player.kingdom and (not p:isNude() or #p:getHandlyIds() > 0) then
        room:askToUseVirtualCard(p, {
          name = "duel",
          skill_name = lipan.name,
          prompt = "#lipan-duel::"..player.id,
          cancelable = true,
          extra_data = {
            exclusive_targets = {player.id},
          },
          card_filter = {
            n = 1,
          }
        })
      end
    end
  end,
})

return lipan
