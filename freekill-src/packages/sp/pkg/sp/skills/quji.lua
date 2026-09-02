local quji = fk.CreateSkill {
  name = "quji",
}

Fk:loadTranslationTable{
  ["quji"] = "去疾",
  [":quji"] = "出牌阶段限一次，若你已受伤，你可以弃置X张牌并选择至多X名已受伤的角色，令这些角色各回复1点体力，然后若你以此法弃置的牌中"..
  "有黑色牌，你失去1点体力。（X为你已损失的体力值）",

  ["#quji"] = "去疾：弃置%arg张牌，令至多等量角色回复体力，若弃置了黑色牌，你失去1点体力",

  ["$quji1"] = "若不去兵之疾，则将何以守国？",
  ["$quji2"] = "愿为将士，略尽绵薄。",
}

quji:addEffect("active", {
  anim_type = "support",
  card_num = function(self, player)
    return player:getLostHp()
  end,
  min_target_num = 1,
  prompt = function(self, player)
    return "#quji:::"..player:getLostHp()
  end,
  can_use = function(self, player)
    return player:isWounded() and player:usedSkillTimes(quji.name, Player.HistoryPhase) == 0
  end,
  card_filter = function(self, player, to_select, selected)
    return #selected < player:getLostHp() and not player:prohibitDiscard(to_select)
  end,
  target_filter = function(self, player, to_select, selected, cards)
    return #selected < player:getLostHp() and to_select:isWounded()
  end,
  on_use = function(self, room, effect)
    local player = effect.from
    local loseHp = table.find(effect.cards, function(id)
      return Fk:getCardById(id).color == Card.Black
    end)
    room:throwCard(effect.cards, quji.name, player, player)
    local tos = effect.tos
    room:sortByAction(tos)
    for _, to in ipairs(tos) do
      if not to.dead and to:isWounded() then
        room:recover{
          who = to,
          num = 1,
          recoverBy = player,
          skillName = quji.name,
        }
      end
    end
    if loseHp and not player.dead then
      room:loseHp(player, 1, quji.name)
    end
  end,
})

return quji
