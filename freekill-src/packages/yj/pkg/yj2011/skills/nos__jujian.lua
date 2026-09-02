local jujian = fk.CreateSkill {
  name = "nos__jujian",
}

Fk:loadTranslationTable{
  ["nos__jujian"] = "举荐",
  [":nos__jujian"] = "出牌阶段限一次，你可以弃置至多三张牌，令一名其他角色摸等量的牌；若你以此法弃置了三张相同类别的牌，你回复1点体力。",

  ["#nos__jujian"] = "举荐：弃置至多三张牌，令一名角色摸等量牌，若弃置三张相同类别牌你回复1点体力",

  ["$nos__jujian1"] = "我看好你！",
  ["$nos__jujian2"] = "将军岂愿抓牌乎？",
}

jujian:addEffect("active", {
  anim_type = "support",
  prompt = "#nos__jujian",
  min_card_num = 1,
  max_card_num = 3,
  target_num = 1,
  can_use = function(self, player)
    return player:usedSkillTimes(jujian.name, Player.HistoryPhase) == 0 and not player:isNude()
  end,
  card_filter = function(self, player, to_select, selected)
    return #selected < 3 and not player:prohibitDiscard(to_select)
  end,
  target_filter = function(self, player, to_select, selected)
    return #selected == 0 and to_select ~= player
  end,
  on_use = function(self, room, effect)
    local player = effect.from
    local target = effect.tos[1]
    room:throwCard(effect.cards, jujian.name, player, player)
    if not target.dead then
      room:drawCards(target, #effect.cards, jujian.name)
    end
    if #effect.cards == 3 and player:isWounded() and not player.dead and
      table.every(effect.cards, function (id)
        return Fk:getCardById(id).type == Fk:getCardById(effect.cards[1]).type
      end) then
      room:recover{
        who = player,
        num = 1,
        recoverBy = player,
        selfName = jujian.name,
      }
    end
  end
})

return jujian