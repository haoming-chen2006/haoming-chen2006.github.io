local tushe = fk.CreateSkill {
  name = "js__tushe",
}

Fk:loadTranslationTable{
  ["js__tushe"] = "图射",
  [":js__tushe"] = "当你使用非装备牌指定目标后，你可以展示所有手牌（没有手牌则跳过），若其中没有基本牌，则你摸X张牌（X为此牌指定的目标数）。",

  ["#js__tushe-invoke"] = "图射：你可以展示所有手牌，若其中没有基本牌，则摸%arg张牌",

  ["$js__tushe1"] = "非英杰不图？吾既谋之且射毕！",
  ["$js__tushe2"] = "汉室衰微，朝纲祸乱，必图后福。",
}

tushe:addEffect(fk.TargetSpecified, {
  anim_type = "drawcard",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(tushe.name) and data.firstTarget and
      data.card.type ~= Card.TypeEquip
  end,
  on_cost = function(self, event, target, player, data)
    return player.room:askToSkillInvoke(player, {
      skill_name = tushe.name,
      prompt = "#js__tushe-invoke:::"..#data.tos,
    })
  end,
  on_use = function(self, event, target, player, data)
    local cards = table.simpleClone(player:getCardIds("h"))
    if not player:isKongcheng() then
      player:showCards(player:getCardIds("h"))
      if player.dead then return end
    end
    if not table.find(cards, function (id)
      return Fk:getCardById(id).type == Card.TypeBasic
    end) and #data.use.tos > 0 then
      player:drawCards(#data.use.tos, tushe.name)
    end
  end,
})

return tushe
