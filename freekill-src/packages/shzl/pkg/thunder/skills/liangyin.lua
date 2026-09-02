local liangyin = fk.CreateSkill {
  name = "liangyin",
}

Fk:loadTranslationTable{
  ["liangyin"] = "良姻",
  [":liangyin"] = "当有牌移出游戏时，你可以令手牌数大于你的一名角色摸一张牌；当有牌从游戏外加入任意角色手牌时，你可以令手牌数小于"..
  "你的一名角色弃置一张牌。",

  ["#liangyin-drawcard"] = "良姻：你可以令一名手牌数大于你的角色摸一张牌",
  ["#liangyin-discard"] = "良姻：你可以令一名手牌数小于你的角色弃置一张牌",

  ["$liangyin1"] = "结得良姻，固吴基业。",
  ["$liangyin2"] = "君恩之命，妾身良姻之福。",
}

liangyin:addEffect(fk.AfterCardsMove, {
  can_trigger = function(self, event, target, player, data)
    if player:hasSkill(liangyin.name) then
      for _, move in ipairs(data) do
        if move.toArea == Card.PlayerSpecial then
          for _, info in ipairs(move.moveInfo) do
            if info.fromArea ~= Card.PlayerSpecial then
              return table.find(player.room.alive_players, function(p)
                return p:getHandcardNum() > player:getHandcardNum()
              end)
            end
          end
        end
        if move.toArea == Card.PlayerHand then
          for _, info in ipairs(move.moveInfo) do
            if info.fromArea == Card.PlayerSpecial then
              return table.find(player.room.alive_players, function(p)
                return p:getHandcardNum() < player:getHandcardNum() and not p:isNude()
              end)
            end
          end
        end
      end
    end
  end,
  on_trigger = function(self, event, target, player, data)
    local choices = {}
    for _, move in ipairs(data) do
      if move.toArea == Card.PlayerSpecial then
        for _, info in ipairs(move.moveInfo) do
          if info.fromArea ~= Card.PlayerSpecial then
            table.insertIfNeed(choices, "drawcard")
          end
        end
      end
      if move.toArea ~= Card.PlayerSpecial then
        for _, info in ipairs(move.moveInfo) do
          if info.fromArea == Card.PlayerSpecial then
            table.insertIfNeed(choices, "discard")
          end
        end
      end
    end
    for _, choice in ipairs(choices) do
      if player:hasSkill(liangyin.name) then
        if (choice == "drawcard" and
          table.find(player.room.alive_players, function(p)
            return p:getHandcardNum() > player:getHandcardNum()
          end)) or
          (choice == "discard" and table.find(player.room.alive_players, function(p)
            return p:getHandcardNum() < player:getHandcardNum() and not p:isNude()
          end)) then
          event:setCostData(self, {choice = choice})
          self:doCost(event, target, player, data)
        end
      end
    end
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local choice = event:getCostData(self).choice
    local targets
    if choice == "drawcard" then
      targets = table.filter(room.alive_players, function(p)
        return p:getHandcardNum() > player:getHandcardNum()
      end)
    elseif choice == "discard" then
      targets = table.filter(room.alive_players, function(p)
        return p:getHandcardNum() < player:getHandcardNum() and not p:isNude()
      end)
    end
    local to = room:askToChoosePlayers(player, {
      min_num = 1,
      max_num = 1,
      targets = targets,
      skill_name = liangyin.name,
      prompt = "#liangyin-"..choice,
      cancelable = true,
    })
    if #to > 0 then
      event:setCostData(self, {tos = to, choice = choice})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local to = event:getCostData(self).tos[1]
    local choice = event:getCostData(self).choice
    if choice == "drawcard" then
      room:notifySkillInvoked(player, liangyin.name, "support")
      player:broadcastSkillInvoke(liangyin.name)
      to:drawCards(1, liangyin.name)
    elseif choice == "discard" then
      room:notifySkillInvoked(player, liangyin.name, "control")
      player:broadcastSkillInvoke(liangyin.name)
      room:askToDiscard(to, {
        min_num = 1,
        max_num = 1,
        include_equip = true,
        skill_name = liangyin.name,
        cancelable = false,
      })
    end
  end,
})

return liangyin
