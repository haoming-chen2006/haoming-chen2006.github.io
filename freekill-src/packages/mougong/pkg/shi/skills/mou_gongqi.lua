local mouGongqi = fk.CreateSkill({
  name = "mou__gongqi",
})

Fk:loadTranslationTable{
  ["mou__gongqi"] = "弓骑",
  [":mou__gongqi"] = "你的攻击范围+4；出牌阶段开始时，你可以弃置一张牌，令其他角色于阶段内不能使用或打出与此牌颜色不同且不为手牌的非虚拟牌响应你使用的牌。",
  ["#mou__gongqi-discard"] = "弓骑：你可弃置一张牌，此阶段其他角色只能使用非虚拟且颜色相同的手牌响应你的牌",
  ["@mou__gongqi-phase"] = "弓骑",
  ["#mou__gongqi_prohibit"] = "弓骑",

  ["$mou__gongqi1"] = "敌寇首级，且看吾一箭取之！",
  ["$mou__gongqi2"] = "末将尤善骑射，今示于主公一观。",
}

mouGongqi:addEffect(fk.EventPhaseStart, {
  anim_type = "offensive",
  can_trigger = function(self, event, target, player, data)
    return target == player and player.phase == Player.Play and player:hasSkill(self) and not player:isNude()
  end,
  on_cost = function (self, event, target, player, data)
    local ids = player.room:askToDiscard(
      player,
      {
        min_num = 1,
        max_num = 1,
        include_equip = true,
        skill_name = mouGongqi.name,
        cancelable = true,
        pattern = ".",
        prompt = "#mou__gongqi-discard", skip = true
      }
    )
    if #ids > 0 then
      event:setCostData(self, ids[1])
      return true
    end

    return false
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local toThrow = event:getCostData(self)
    local colorStr = Fk:getCardById(toThrow):getColorString()
    room:throwCard(toThrow, self.name, player, player)
    room:setPlayerMark(player, "@mou__gongqi-phase", colorStr)
  end,
})

mouGongqi:addEffect(fk.HandleAskForPlayCard, {
  can_refresh = function(self, event, target, player, data)
    return data.eventData and data.eventData.from == player and player:getMark("@mou__gongqi-phase") ~= 0
  end,
  on_refresh = function(self, event, target, player, data)
    local room = player.room
    if not data.afterRequest then
      room:setBanner("mou__gongqi_user", player.id)
    else
      room:setBanner("mou__gongqi_user", 0)
    end
  end,
})

mouGongqi:addEffect("atkrange", {
  correct_func = function(self, from, to)
    if from:hasSkill(mouGongqi.name) then
      return 4
    end
  end,
})

mouGongqi:addEffect("prohibit", {
  prohibit_use = function(self, player, card)
    local room = Fk:currentRoom()
    local user = room:getBanner("mou__gongqi_user")
    if user and player.id ~= user then
      user = room:getPlayerById(user)
      local colorStr = user:getMark("@mou__gongqi-phase")
      if colorStr == 0 then
        return false
      end

      local subcards = card:isVirtual() and card.subcards or {card.id}
      return
        #subcards > 0 and
        (
          card.color == Card.NoColor or
          card:getColorString() ~= colorStr or
          table.find(subcards, function(id)
            return room:getCardArea(id) ~= Card.PlayerHand
          end)
        )
    end
  end,
  prohibit_response = function(self, player, card)
    local room = Fk:currentRoom()
    local user = room:getBanner("mou__gongqi_user")
    if user and player.id ~= user then
      user = room:getPlayerById(user)
      local colorStr = user:getMark("@mou__gongqi-phase")
      if colorStr == 0 then
        return false
      end

      local subcards = card:isVirtual() and card.subcards or {card.id}
      return
        #subcards > 0 and
        (
          card.color == Card.NoColor or
          card:getColorString() ~= colorStr or
          table.find(subcards, function(id)
            return room:getCardArea(id) ~= Card.PlayerHand
          end)
        )
    end
  end,
})

return mouGongqi
