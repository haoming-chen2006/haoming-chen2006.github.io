local daiyan = fk.CreateSkill {
  name = "daiyan"
}

Fk:loadTranslationTable{
  ["daiyan"] = "怠宴",
  [":daiyan"] = "结束阶段，你可以令一名其他角色从牌堆中获得一张<font color='red'>♥</font>基本牌，若其是上回合此技能选择的角色，其失去1点体力。",

  ["#daiyan-choose"] = "怠宴：令一名其他角色摸一张<font color='red'>♥</font>基本牌，若为上回合选择的角色，其失去1点体力",
  ["daiyan_target"] = "上次怠宴目标",

  ["$daiyan1"] = "汝可于宫中多留几日无妨。",
  ["$daiyan2"] = "胡氏受屈，吾亦心不安。",
}

Fk:addTargetTip{
  name = "daiyan",
  target_tip = function(self, player, to_select, selected, selected_cards, card, selectable)
    if not selectable then return end
    if player:getMark("daiyan_record-turn") == to_select.id then
      return "daiyan_target"
    end
  end,
}

daiyan:addEffect(fk.EventPhaseStart, {
  anim_type = "support",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(daiyan.name) and player.phase == Player.Finish and
      #player.room:getOtherPlayers(player, false) > 0
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local to = room:askToChoosePlayers(player, {
      skill_name = daiyan.name,
      min_num = 1,
      max_num = 1,
      targets = room:getOtherPlayers(player, false),
      prompt = "#daiyan-choose",
      cancelable = true,
      target_tip_name = daiyan.name,
    })
    if #to > 0 then
      event:setCostData(self, {tos = to})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local to = event:getCostData(self).tos[1]
    room:setPlayerMark(player, "daiyan_record", to.id)
    local yes = player:getMark("daiyan_record-turn") == to.id
    local card = room:getCardsFromPileByRule(".|.|heart|.|.|basic")
    if #card > 0 then
      room:moveCardTo(card, Card.PlayerHand, to, fk.ReasonJustMove, daiyan.name, nil, true, to)
    end
    if yes and not to.dead then
      room:loseHp(to, 1, daiyan.name)
    end
  end,
})
daiyan:addEffect(fk.TurnStart, {
  can_refresh = function (self, event, target, player, data)
    return target == player and player:getMark("daiyan_record") ~= 0
  end,
  on_refresh = function (self, event, target, player, data)
    local room = player.room
    room:setPlayerMark(player, "daiyan_record-turn", player:getMark("daiyan_record"))
    room:setPlayerMark(player, "daiyan_record", 0)
  end,
})

return daiyan
