local qiangxi = fk.CreateSkill({
  name = "qiangxi",
})

Fk:loadTranslationTable{
  ["qiangxi"] = "强袭",
  [":qiangxi"] = "出牌阶段限一次，你可以失去1点体力或弃置一张武器牌，并选择你攻击范围内的一名其他角色，对其造成1点伤害。",

  ["#qiangxi"] = "强袭：弃一张武器牌，或不选牌失去1点体力，对目标角色造成1点伤害",

  ["$qiangxi1"] = "吃我一戟！",
  ["$qiangxi2"] = "看我三步之内取你小命！",
}

qiangxi:addEffect("active", {
  anim_type = "offensive",
  prompt = "#qiangxi",
  max_phase_use_time = 1,
  max_card_num = 1,
  target_num = 1,
  card_filter = function(self, player, to_select, selected)
    return Fk:getCardById(to_select).sub_type == Card.SubtypeWeapon and not player:prohibitDiscard(to_select)
  end,
  target_filter = function(self, player, to_select, selected, selected_cards)
    return #selected == 0 and player:inMyAttackRange(to_select, nil, selected_cards)
  end,
  on_use = function(self, room, effect)
    local player = effect.from
    local target = effect.tos[1]
    if #effect.cards > 0 then
      room:throwCard(effect.cards, qiangxi.name, player, player)
    else
      room:loseHp(player, 1, qiangxi.name)
    end
    if not target.dead then
      room:damage{
        from = player,
        to = target,
        damage = 1,
        skillName = qiangxi.name,
      }
    end
  end,
})

return qiangxi
