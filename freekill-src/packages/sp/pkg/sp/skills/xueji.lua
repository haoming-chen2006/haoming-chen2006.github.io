local xueji = fk.CreateSkill {
  name = "xueji",
}

Fk:loadTranslationTable {
  ["xueji"] = "血祭",
  [":xueji"] = "出牌阶段限一次，你可以弃置一张红色牌，对你攻击范围内的至多X名其他角色各造成1点伤害（X为你损失的体力值），然后这些角色各摸一张牌。",

  ["#xueji"] = "血祭：弃置一张红色牌，对至多%arg名角色各造成1点伤害并各摸一张牌",

  ["$xueji1"] = "取你首级，祭先父之灵！",
  ["$xueji2"] = "这炽热的鲜血，父亲，你可感觉得到？",
}

xueji:addEffect("active", {
  anim_type = "offensive",
  prompt = function(self, player)
    return "#xueji:::" .. player:getLostHp()
  end,
  card_num = 1,
  min_target_num = 1,
  max_target_num = function(self, player)
    return player:getLostHp()
  end,
  can_use = function(self, player)
    return player:isWounded() and player:usedSkillTimes(xueji.name, Player.HistoryPhase) == 0
  end,
  card_filter = function(self, player, to_select, selected)
    return #selected == 0 and Fk:getCardById(to_select).color == Card.Red and
      not player:prohibitDiscard(to_select)
  end,
  target_filter = function(self, player, to_select, selected, selected_cards)
    return #selected < player:getLostHp() and #selected_cards > 0 and
      player:inMyAttackRange(to_select, nil, selected_cards)
  end,
  on_use = function(self, room, effect)
    local player = effect.from
    room:throwCard(effect.cards, xueji.name, player, player)
    local tos = effect.tos
    room:sortByAction(tos)
    for _, p in ipairs(tos) do
      if not p.dead then
        room:damage {
          from = player,
          to = p,
          damage = 1,
          skillName = xueji.name,
        }
      end
    end
    for _, p in ipairs(tos) do
      if not p.dead then
        p:drawCards(1, xueji.name)
      end
    end
  end,
})

return xueji
