local mieji = fk.CreateSkill {
  name = "nos__mieji",
}

Fk:loadTranslationTable{
  ["nos__mieji"] = "灭计",
  [":nos__mieji"] = "你使用黑色非延时类锦囊仅指定一个目标时，可以额外指定一个目标。",

  ["#nos__mieji-choose"] = "灭计：你可以为%arg额外指定一个目标",

  ["$nos__mieji1"] = "我要的是斩草除根。",
  ["$nos__mieji2"] = "叫天天不应，叫地地不灵~",
}

mieji:addEffect(fk.AfterCardTargetDeclared, {
  anim_type = "control",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(mieji.name) and
      data.card.color == Card.Black and data.card:isCommonTrick() and
      data:isOnlyTarget(data.tos[1]) and #data:getExtraTargets() > 0
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local to = room:askToChoosePlayers(player, {
      targets = data:getExtraTargets(),
      min_num = 1,
      max_num = 1,
      prompt = "#nos__mieji-choose:::" .. data.card:toLogString(),
      skill_name = mieji.name,
    })
    if #to > 0 then
    event:setCostData(self, {tos = to})
    return true
    end
  end,
  on_use = function(self, event, target, player, data)
    data:addTarget(event:getCostData(self).tos[1])
  end,
})

return mieji
