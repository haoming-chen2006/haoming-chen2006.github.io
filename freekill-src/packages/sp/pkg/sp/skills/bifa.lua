local bifa = fk.CreateSkill {
  name = "bifa",
}

Fk:loadTranslationTable{
  ["bifa"] = "笔伐",
  [":bifa"] = "结束阶段，你可以将一张手牌移出游戏并指定一名其他角色。该角色的回合开始时，其观看你移出游戏的牌并选择一项："..
  "1.交给你一张与此牌同类型的手牌并获得此牌；2.将此牌置入弃牌堆，然后失去1点体力。",

  ["$bifa"] = "笔伐",
  ["#bifa-choose"] = "笔伐：将一张手牌移出游戏并指定一名其他角色",
  ["#bifa-ask"] = "笔伐：交给 %src 一张%arg并获得%arg2；或点“取消”置入弃牌堆并失去1点体力",

  ["$bifa1"] = "笔墨纸砚，皆兵器也！",
  ["$bifa2"] = "汝德行败坏，人所不齿也！",
}

bifa:addEffect(fk.EventPhaseStart, {
  anim_type = "offensive",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(bifa.name) and player.phase == Player.Finish and
      not player:isKongcheng() and
      table.find(player.room:getOtherPlayers(player, false), function(p)
        return #p:getPile("$bifa") == 0
      end)
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local targets = table.filter(room:getOtherPlayers(player, false), function(p)
      return #p:getPile("$bifa") == 0
    end)
    local tos, id = room:askToChooseCardsAndPlayers(player, {
      min_card_num = 1,
      max_card_num = 1,
      min_num = 1,
      max_num = 1,
      targets = targets,
      pattern = ".|.|.|hand",
      prompt = "#bifa-choose",
      skill_name = bifa.name,
    })
    if #tos > 0 then
      event:setCostData(self, {tos = tos, cards = {id}})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local to = event:getCostData(self).tos[1] ---@type ServerPlayer
    room:setPlayerMark(to, "bifa_src", player.id)
    to:addToPile("$bifa", event:getCostData(self).cards, false, bifa.name)
  end,
})

bifa:addEffect("visibility", {
  card_visible = function(self, player, card)
    if player:getPileNameOfId(card.id) == "$bifa" then
      return false
    end
  end
})

bifa:addEffect(fk.TurnStart, {
  anim_type = "control",
  is_delay_effect = true,
  can_trigger = function(self, event, target, player, data)
    return #target:getPile("$bifa") > 0 and target:getMark("bifa_src") == player.id
  end,
  on_cost = Util.TrueFunc,
  on_use = function(self, event, target, player, data)
    local room = player.room
    room:setPlayerMark(target, "bifa_src", 0)
    if player.dead or target:isKongcheng() then
      room:moveCardTo(target:getPile("$bifa"), Card.DiscardPile, nil, fk.ReasonPutIntoDiscardPile, bifa.name, nil, true)
      if not target.dead then
        room:loseHp(target, 1, bifa.name)
      end
      return
    end
    local card = Fk:getCardById(target:getPile("$bifa")[1])
    local type = card:getTypeString()
    local give = room:askToCards(target, {
      min_num = 1,
      max_num = 1,
      pattern = ".|.|.|hand|.|" .. type,
      prompt = "#bifa-ask:"..player.id.."::"..type..":"..card:toLogString(),
      skill_name = bifa.name,
    })
    if #give > 0 then
      room:moveCardTo(give, Card.PlayerHand, player, fk.ReasonGive, bifa.name, nil, false, target)
      if not target.dead and #target:getPile("$bifa") > 0 then
        room:moveCardTo(target:getPile("$bifa"), Card.PlayerHand, target, fk.ReasonPrey, bifa.name, nil, false, target)
      end
    else
      room:moveCardTo(target:getPile("$bifa"), Card.DiscardPile, nil, fk.ReasonPutIntoDiscardPile, bifa.name, nil, true, target)
      if not target.dead then
        room:loseHp(target, 1, bifa.name)
      end
    end
  end,
})

return bifa
