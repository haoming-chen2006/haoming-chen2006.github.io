local kongzhi = fk.CreateSkill {
  name = "kongzhi",
  tags = { Skill.Compulsory },
}

Fk:loadTranslationTable{
  ["kongzhi"] = "空志",
  [":kongzhi"] = "锁定技，当你使用【杀】指定唯一目标后，你获得其至多三张牌；若你已受伤，则普通锦囊牌对你无效且你的基本牌均视为【闪】。"
}

kongzhi:addEffect(fk.TargetSpecified, {
  anim_type = "offensive",
  can_trigger = function(self, event, target, player, data)
    return
      target == player and
      data.card.trueName == "slash" and
      player:hasSkill(kongzhi.name) and
      data:isOnlyTarget(data.to) and
      data.to:isAlive() and
      not data.to:isNude()
  end,
  on_use = function(self, event, target, player, data)
    ---@type string
    local skillName = kongzhi.name
    local room = player.room
    local ids = room:askToChooseCards(
      player,
      {
        min = 1,
        max = 3,
        target = data.to,
        flag = "he",
        skill_name = skillName,
      }
    )

    room:obtainCard(player, ids, false, fk.ReasonPrey, player, skillName)
  end,
})

kongzhi:addEffect(fk.PreCardEffect, {
  anim_type = "offensive",
  can_trigger = function(self, event, target, player, data)
    return data.to == player and data.card:isCommonTrick() and player:isWounded() and player:hasSkill(kongzhi.name)
  end,
  on_use = function(self, event, target, player, data)
    data.nullified = true
  end,
})

kongzhi:addEffect("filter", {
  anim_type = "defensive",
  card_filter = function(self, card, player, isJudgeEvent)
    return
      player:isWounded() and
      player:hasSkill(kongzhi.name) and
      card.type == Card.TypeBasic and
      (table.contains(player:getCardIds("h"), card.id) or isJudgeEvent)
  end,
  view_as = function(self, player, card)
    local c = Fk:cloneCard("jink", card.suit, card.number)
    c.skillName = kongzhi.name
    return c
  end,
})

return kongzhi
