local zhongjian = fk.CreateSkill {
  name = "zhongjian",
}

Fk:loadTranslationTable{
  ["zhongjian"] = "忠鉴",
  [":zhongjian"] = "出牌阶段限一次，你可以展示一张手牌，并展示一名手牌数大于体力值的其他角色X张手牌（X为其手牌数和体力值之差）。"..
  "若其以此法展示的牌与你展示的牌中：有颜色相同，你摸一张牌或弃置其一张牌；有点数相同，本回合此技能改为“出牌阶段限两次”；"..
  "均不同且你手牌上限大于0，你的手牌上限-1。",

  ["#zhongjian"] = "忠鉴：展示一张手牌，并展示一名角色超过其体力值张数的手牌",
  ["#zhongjian-choice"] = "忠鉴：弃置 %dest 一张牌，或点“取消”摸一张牌",

  ["$zhongjian1"] = "浊世风云变幻，当以明眸洞察。",
  ["$zhongjian2"] = "心中自有明镜，可鉴奸佞忠良。",
}

zhongjian:addEffect("active", {
  anim_type = "control",
  prompt = "#zhongjian",
  card_num = 1,
  target_num = 1,
  can_use = function(self, player)
    return player:usedSkillTimes(zhongjian.name, Player.HistoryPhase) < (1 + player:getMark("zhongjian_times-turn"))
  end,
  card_filter = function(self, player, to_select, selected)
    return #selected == 0 and table.contains(player:getCardIds("h"), to_select)
  end,
  target_filter = function(self, player, to_select, selected, selected_cards)
    return #selected == 0 and to_select ~= player and #selected_cards == 1 and
      to_select:getHandcardNum() > to_select.hp
  end,
  on_use = function(self, room, effect)
    local player = effect.from
    local target = effect.tos[1]
    player:showCards(effect.cards)
    local n = target:getHandcardNum() - target.hp
    if player.dead or target.dead or n < 1 then return end
    local cards = room:askToChooseCards(player, {
      target = target,
      min = n,
      max = n,
      flag = "h",
      skill_name = zhongjian.name,
    })
    target:showCards(cards)
    if player.dead then return end
    local yes = false
    if table.find(cards, function(id)
      return Fk:getCardById(id).number == Fk:getCardById(effect.cards[1]).number
    end) then
      yes = true
      room:setPlayerMark(player, "zhongjian_times-turn", 1)
    end
    if table.find(cards, function(id)
      return Fk:getCardById(id).color == Fk:getCardById(effect.cards[1]).color
    end) then
      yes = true
      if target.dead or target:isNude() or
        not room:askToSkillInvoke(player, {
          skill_name = zhongjian.name,
          prompt = "#zhongjian-choice::"..target.id,
        }) then
        player:drawCards(1, zhongjian.name)
      else
        local id = room:askToChooseCard(player, {
          target = target,
          flag = "he",
          skill_name = zhongjian.name,
        })
        room:throwCard(id, zhongjian.name, target, player)
      end
    end
    if not yes and player:getMaxCards() > 0 and not player.dead then
      room:addPlayerMark(player, MarkEnum.MinusMaxCards, 1)
    end
  end,
})

return zhongjian
