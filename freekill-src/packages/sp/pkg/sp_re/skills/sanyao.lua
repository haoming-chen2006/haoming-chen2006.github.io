local sanyao = fk.CreateSkill {
  name = "sanyao",
}

Fk:loadTranslationTable{
  ["sanyao"] = "散谣",
  [":sanyao"] = "出牌阶段限一次，你可以弃置一张牌并选择一名体力值最大的角色，你对其造成1点伤害。",

  ["#sanyao"] = "散谣：弃一张牌，对一名体力值最大的角色造成1点伤害",

  ["$sanyao1"] = "三人成虎，事多有。",
  ["$sanyao2"] = "散谣惑敌，不攻自破！",
}

sanyao:addEffect("active", {
  anim_type = "offensive",
  prompt = "#sanyao",
  card_num = 1,
  target_num = 1,
  can_use = function(self, player)
    return player:usedSkillTimes(sanyao.name, Player.HistoryPhase) == 0
  end,
  card_filter = function(self, player, to_select, selected)
    return #selected == 0 and not player:prohibitDiscard(to_select)
  end,
  target_filter = function(self, player, to_select, selected, cards)
    return #selected == 0 and
      table.every(Fk:currentRoom().alive_players, function(p)
        return p.hp <= to_select.hp
      end)
  end,
  on_use = function(self, room, effect)
    local player = effect.from
    local target = effect.tos[1]
    room:throwCard(effect.cards, sanyao.name, player, player)
    if not target.dead then
      room:damage{
        from = player,
        to = target,
        damage = 1,
        skillName = sanyao.name,
      }
    end
  end,
})

return sanyao