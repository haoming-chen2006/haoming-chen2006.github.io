local qingce = fk.CreateSkill {
  name = "qingce",
}

Fk:loadTranslationTable{
  ["qingce"] = "清侧",
  [":qingce"] = "出牌阶段，你可以移去一张“荣”，然后弃置场上的一张牌。",

  ["#qingce"] = "清侧：你可以移去一张“荣”，弃置场上的一张牌",

  ["$qingce1"] = "感明帝之恩，清君侧之贼。",
  ["$qingce2"] = "得太后手诏，清奸佞乱臣。",
}

qingce:addEffect("active", {
  anim_type = "control",
  target_num = 1,
  card_num = 1,
  prompt = "#qingce",
  expand_pile = "$guanqiujian__glory",
  card_filter = function(self, player, to_select, selected)
    return #selected == 0 and table.contains(player:getPile("$guanqiujian__glory"), to_select)
  end,
  target_filter = function(self, player, to_select, selected)
    return #to_select:getCardIds("ej") > 0
  end,
  on_use = function(self, room, effect)
    local player = effect.from
    local target = effect.tos[1]
    room:moveCardTo(effect.cards, Card.DiscardPile, player, fk.ReasonPutIntoDiscardPile, qingce.name, "$guanqiujian__glory")
    if player.dead or target.dead then return end
    if #target:getCardIds("ej") > 0 then
      local card = room:askToChooseCard(player, {
        target = target,
        flag = "ej",
        skill_name = qingce.name,
      })
      room:throwCard(card, qingce.name, target, player)
    end
  end,
})

return qingce
