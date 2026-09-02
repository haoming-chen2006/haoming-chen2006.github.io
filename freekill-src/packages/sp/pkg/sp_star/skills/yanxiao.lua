local yanxiao = fk.CreateSkill {
  name = "yanxiao",
}

Fk:loadTranslationTable{
  ["yanxiao"] = "言笑",
  [":yanxiao"] = "出牌阶段，你可以将一张<font color='red'>♦</font>牌置于一名角色的判定区内，判定区内有“言笑”牌的角色下个判定阶段开始时，"..
  "获得其判定区里的所有牌。",

  ["#yanxiao"] = "言笑：将一张<font color='red'>♦</font>置入一名角色判定区，其判定阶段开始时获得判定区内所有牌",

  ["yanxiao_trick"] = "言笑",
  [":yanxiao_trick"] = "这张牌视为延时锦囊<br/><b>效果：</b>判定区内有“言笑”牌的角色判定阶段开始时，获得其判定区里的所有牌。",
}

yanxiao:addEffect("active", {
  anim_type = "support",
  prompt = "#yanxiao",
  card_num = 1,
  target_num = 1,
  card_filter = function(self, player, to_select, selected)
    return #selected == 0 and Fk:getCardById(to_select).suit == Card.Diamond
  end,
  target_filter = function(self, player, to_select, selected)
    return #selected == 0
  end,
  on_use = function(self, room, effect)
    local target = effect.tos[1]
    local card = Fk:cloneCard("yanxiao_trick")
    card:addSubcards(effect.cards)
    target:addVirtualEquip(card)
    room:moveCardTo(card, Card.PlayerJudge, target, fk.ReasonJustMove, yanxiao.name, nil, true, effect.from)
  end,
})

yanxiao:addEffect(fk.EventPhaseStart, {
  mute = true,
  is_delay_effect = true,
  can_trigger = function(self, event, target, player, data)
    return player.phase == Player.Judge and player:hasDelayedTrick("yanxiao_trick")
  end,
  on_use = function(self, event, target, player, data)
    player.room:obtainCard(player, player:getCardIds("j"), true, fk.ReasonJustMove)
  end,
})

return yanxiao
