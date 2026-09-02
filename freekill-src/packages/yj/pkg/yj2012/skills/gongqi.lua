local gongqi = fk.CreateSkill {
  name = "gongqi",
}

Fk:loadTranslationTable{
  ["gongqi"] = "弓骑",
  [":gongqi"] = "出牌阶段限一次，你可以弃置一张牌，此回合你的攻击范围无限。若你以此法弃置的牌为装备牌，你可以弃置一名其他角色的一张牌。",

  ["#gongqi"] = "弓骑：弃一张牌，本回合攻击范围无限；若弃置装备牌，可以弃置一名其他角色的一张牌",
  ["#gongqi-choose"] = "弓骑：你可以弃置一名其他角色的一张牌",

  ["$gongqi1"] = "看我箭弩弓张，取你性命！",
  ["$gongqi2"] = "龙驹陷阵，神弓破敌！",
}

gongqi:addEffect("active", {
  anim_type = "offensive",
  prompt = "#gongqi",
  card_num = 1,
  target_num = 0,
  can_use = function(self, player)
    return player:usedSkillTimes(gongqi.name, Player.HistoryPhase) == 0
  end,
  card_filter = function(self, player, to_select, selected)
    return #selected == 0 and not player:prohibitDiscard(to_select)
  end,
  target_filter = Util.FalseFunc,
  on_use = function(self, room, effect)
    local player = effect.from
    room:throwCard(effect.cards, gongqi.name, player, player)
    if player.dead then return end
    if Fk:getCardById(effect.cards[1]).type == Card.TypeEquip then
      local targets = table.filter(room:getOtherPlayers(player, false), function(p)
        return not p:isNude()
      end)
      if #targets == 0 then return end
      local to = room:askToChoosePlayers(player, {
        skill_name = gongqi.name,
        min_num = 1,
        max_num = 1,
        targets = targets,
        prompt = "#gongqi-choose",
        cancelable = true,
      })
      if #to > 0 then
        local id = room:askToChooseCard(player, {
          target = to[1],
          flag = "he",
          skill_name = gongqi.name,
        })
        room:throwCard(id, gongqi.name, to[1], player)
      end
    end
  end,
})

gongqi:addEffect("atkrange", {
  correct_func = function (self, from, to)
    if from:usedSkillTimes(gongqi.name, Player.HistoryTurn) > 0 then
      return 999
    end
  end,
})

return gongqi
