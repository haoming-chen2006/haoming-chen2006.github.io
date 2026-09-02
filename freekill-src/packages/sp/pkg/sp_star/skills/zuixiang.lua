
local zuixiang = fk.CreateSkill {
  name = "zuixiang",
  tags = { Skill.Limited },
}

Fk:loadTranslationTable{
  ["zuixiang"] = "醉乡",
  [":zuixiang"] = "限定技，准备阶段开始时，你可以展示牌库顶的3张牌置于你的武将牌上，你不可以使用或打出与该些牌同类的牌，所有同类牌对你无效。"..
  "之后每个你的准备阶段，你须重复展示一次，直至该些牌中任意两张点数相同时，将你武将牌上的全部牌置于你的手上。",

  ["$zuixiang1"] = "懵懵醉乡中，天下心中藏。",
  ["$zuixiang2"] = "今朝有酒，管甚案牍俗事。",
}

zuixiang:addEffect(fk.EventPhaseStart, {
  anim_type = "drawcard",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(zuixiang.name) and player.phase == Player.Start and
      (player:usedSkillTimes(zuixiang.name, Player.HistoryGame) == 0 or #player:getPile(zuixiang.name) > 0)
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local cards = room:getNCards(3)
    player:addToPile(zuixiang.name, cards, true, zuixiang.name)
    local number = {}
    for i = 1, #player:getPile(zuixiang.name), 1 do
      table.insertIfNeed(number, Fk:getCardById(player:getPile(zuixiang.name)[i], true).number)
    end
    if #number < #player:getPile(zuixiang.name) then
      room:moveCards({
        ids = player:getPile(zuixiang.name),
        from = player,
        fromArea = Card.PlayerSpecial,
        to = player,
        toArea = Card.PlayerHand,
        moveReason = fk.ReasonJustMove,
        skillName = zuixiang.name,
        specialName = zuixiang.name,
        moveVisible = true,
      })
    end
  end,
})

zuixiang:addEffect(fk.PreCardEffect, {
  anim_type = "defensive",
  is_delay_effect = true,
  can_trigger = function(self, event, target, player, data)
    return #player:getPile(zuixiang.name) > 0 and data.to == player and
      table.find(player:getPile(zuixiang.name), function(id)
        return Fk:getCardById(id).type == data.card.type
      end)
  end,
  on_cost = Util.TrueFunc,
  on_use = function(self, event, target, player, data)
    data.nullified = true
  end,
})

zuixiang:addEffect(fk.TargetConfirmed, {
  anim_type = "defensive",
  is_delay_effect = true,
  can_trigger = function(self, event, target, player, data)
    return target == player and #player:getPile(zuixiang.name) > 0 and
      data.card.sub_type == Card.SubtypeDelayedTrick and
      table.find(player:getPile(zuixiang.name), function(id)
        return Fk:getCardById(id).type == Card.TypeTrick
      end)
  end,
  on_cost = Util.TrueFunc,
  on_use = function(self, event, target, player, data)
    data:cancelTarget(player)
  end,
})

zuixiang:addEffect("prohibit", {
  prohibit_use = function(self, player, card)
    return #player:getPile(zuixiang.name) > 0 and
      table.find(player:getPile(zuixiang.name), function(id)
        return Fk:getCardById(id).type == card.type
      end)
  end,
  prohibit_response = function(self, player, card)
    return #player:getPile(zuixiang.name) > 0 and
      table.find(player:getPile(zuixiang.name), function(id)
        return Fk:getCardById(id).type == card.type
      end)
  end,
})

zuixiang:addEffect("invalidity", {
  invalidity_func = function(self, player, skill)
    if #player:getPile(zuixiang.name) > 0 and skill:getSkeleton().attached_equip then
      return table.find(player:getPile(zuixiang.name), function(id)
        return Fk:getCardById(id).type == Card.TypeEquip
      end)
    end
  end,
})

return zuixiang
