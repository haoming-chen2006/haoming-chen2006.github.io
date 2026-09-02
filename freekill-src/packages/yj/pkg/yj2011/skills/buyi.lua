local buyi = fk.CreateSkill {
  name = "buyi",
}

Fk:loadTranslationTable{
  ["buyi"] = "补益",
  [":buyi"] = "当一名角色进入濒死状态时，你可以展示该角色一张手牌，若不为基本牌，则其弃置此牌并回复1点体力。",

  ["#buyi-invoke"] = "补益：你可以展示%dest的一张手牌，若为非基本牌则其弃掉并回复1点体力",

  ["$buyi1"] = "吾乃吴国之母，何人敢放肆？",
  ["$buyi2"] = "有老身在，汝等尽可放心。",
}

buyi:addEffect(fk.EnterDying, {
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(buyi.name) and not target:isKongcheng()
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    if room:askToSkillInvoke(player, {
      skill_name = buyi.name,
      prompt = "#buyi-invoke::"..target.id,
    }) then
      event:setCostData(self, {tos = {target}})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local id = room:askToChooseCard(player, {
      target = target,
      flag = "h",
      skill_name = buyi.name
    })
    target:showCards(id)
    if target.dead then return end
    if Fk:getCardById(id).type ~= Card.TypeBasic and table.contains(target:getCardIds("h"), id) and
      not target:prohibitDiscard(id) then
      room:throwCard(id, buyi.name, target, target)
      if target.dead or not target:isWounded() then return end
      room:recover{
        who = target,
        num = 1,
        recoverBy = player,
        skillName = buyi.name,
      }
    end
  end,
})

return buyi