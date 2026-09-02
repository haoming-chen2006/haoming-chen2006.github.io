local mouWeimu = fk.CreateSkill({
  name = "mou__weimu",
  tags = { Skill.Compulsory },
})

Fk:loadTranslationTable{
  ["mou__weimu"] = "帷幕",
  [":mou__weimu"] = "锁定技，当你成为黑色锦囊牌的目标时，取消之。"..
  "<br><b>二级</b>：增加内容：每轮开始时，若你上一轮成为其他角色使用牌的目标的次数不大于1次，则你从弃牌堆随机获得一张黑色锦囊牌或者防具牌。",
  ["@@mou__weimu_upgrade"] = "帷幕二级",

  ["$mou__weimu1"] = "执棋之人，不可与入局者共论。",
  ["$mou__weimu2"] = "世有千万门法，与我均无纠葛。",
  ["$mou__weimu3"] = "方圆之间，参透天地万物心！",
  ["$mou__weimu4"] = "帐前独知行表，幕后可见人心！",
}

mouWeimu:addEffect(fk.TargetConfirming, {
  anim_type = "defensive",
  can_trigger = function(self, event, target, player, data)
    return
      player:hasSkill(mouWeimu.name) and
      target == player and
      data.card.type == Card.TypeTrick and
      data.card.color == Card.Black and
      not data.cancelled
  end,
  on_use = function(self, event, target, player, data)
    data:cancelCurrentTarget()
  end,
})

mouWeimu:addEffect(fk.RoundStart, {
  anim_type = "drawcard",
  can_trigger = function(self, event, target, player, data)
    if player:getMark("@@mou__weimu_upgrade") > 0 then
      local room = player.room
      local roundEvents = room.logic:getEventsByRule(GameEvent.Round, 2, Util.TrueFunc, 0)
      if #roundEvents == 2 then
        return #room.logic:getEventsByRule(GameEvent.UseCard, 3, function (e)
          if e.id > roundEvents[1].id then return false end
          local use = e.data
          return use.from ~= player and table.contains(use.tos, player)
        end, roundEvents[2].id) <= 1
      end
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local ids = room:getCardsFromPileByRule(".|.|spade,club|.|.|trick;.|.|.|.|.|armor")
    if #ids > 0 then
      room:moveCardTo(ids, Player.Hand, player, fk.ReasonJustMove, mouWeimu.name)
    end
  end,
})

mouWeimu:addLoseEffect(function (self, player)
  if player:getMark("@@mou__weimu_upgrade") > 0 then
    player.room:setPlayerMark(player, "@@mou__weimu_upgrade", 0)
  end
end)

return mouWeimu
