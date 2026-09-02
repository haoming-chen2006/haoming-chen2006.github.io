local faen = fk.CreateSkill {
  name = "faen",
}

Fk:loadTranslationTable{
  ["faen"] = "法恩",
  [":faen"] = "当一名角色的武将牌翻至正面朝上或横置后，你可以令其摸一张牌。",

  ["#faen-invoke"] = "法恩：你可以令 %dest 摸一张牌",

  ["$faen1"] = "王法威仪，恩泽天下。",
  ["$faen2"] = "法外有情，恩威并举。",
}

local spec = {
  on_cost = function(self, event, target, player, data)
    local room = player.room
    if room:askToSkillInvoke(player, {
      skill_name = faen.name,
      prompt = "#faen-invoke::"..target.id,
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
    return player:hasSkill(faen.name) and not target.dead and target.faceup
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
