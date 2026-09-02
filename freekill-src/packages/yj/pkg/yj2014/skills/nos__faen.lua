local faen = fk.CreateSkill {
  name = "nos__faen",
}

Fk:loadTranslationTable{
  ["nos__faen"] = "法恩",
  [":nos__faen"] = "当一名角色的武将牌翻面或横置时，你可以令其摸一张牌。",

  ["#nos__faen-invoke"] = "法恩：你可以令 %dest 摸一张牌",

  ["$nos__faen1"] = "礼法容情，皇恩浩荡。",
  ["$nos__faen2"] = "法理有度，恩威并施。",
}

local spec = {
  on_cost = function(self, event, target, player, data)
    local room = player.room
    if room:askToSkillInvoke(player, {
      skill_name = faen.name,
      prompt = "#nos__faen-invoke::"..target.id,
    }) then
      event:setCostData(self, {tos = {target}})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    target:drawCards(1, faen.name)
  end,
}

faen:addEffect(fk.TurnedOver, {
  anim_type = "support",
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(faen.name) and not target.dead
  end,
  on_cost = spec.on_cost,
  on_use = spec.on_use,
})

faen:addEffect(fk.ChainStateChanged, {
  anim_type = "support",
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(faen.name) and not target.dead and target.chained
  end,
  on_cost = spec.on_cost,
  on_use = spec.on_use,
})

return faen
