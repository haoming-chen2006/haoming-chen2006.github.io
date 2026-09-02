local zhaohan = fk.CreateSkill {
  name = "js__zhaohan",
  tags = { },
}

Fk:loadTranslationTable{
  ["js__zhaohan"] = "昭汉",
  [":js__zhaohan"] = "锁定技，准备阶段，若牌堆未洗过牌，你回复1点体力，否则你失去1点体力。",

  ["$js__zhaohan1"] = "身居崇高之位，却负陛下之寄！",
  ["$js__zhaohan2"] = "天子尚犹蒙尘，自当奔问官守！",
}

zhaohan:addEffect(fk.EventPhaseStart, {
  mute = true,
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(zhaohan.name) and player.phase == Player.Start and
      ((player:getMark(zhaohan.name) == 0 and player:isWounded()) or player:getMark(zhaohan.name) > 0)
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    player:broadcastSkillInvoke(zhaohan.name)
    if player:getMark(zhaohan.name) == 0 then
      room:notifySkillInvoked(player, zhaohan.name, "support")
      room:recover{
        who = player,
        num = 1,
        recoverBy = player,
        skillName = zhaohan.name,
      }
    else
      room:notifySkillInvoked(player, zhaohan.name, "negative")
      room:loseHp(player, 1, zhaohan.name)
    end
  end,
})

zhaohan:addEffect(fk.AfterDrawPileShuffle, {
  can_refresh = function(self, event, target, player, data)
    return player:hasSkill(zhaohan.name, true)
  end,
  on_refresh = function(self, event, target, player, data)
    player.room:setPlayerMark(player, zhaohan.name, 1)
  end,
})

return zhaohan
