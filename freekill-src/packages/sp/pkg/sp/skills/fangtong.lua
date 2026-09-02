local fangtong = fk.CreateSkill {
  name = "sp__fangtong",
  tags = { Skill.Compulsory },
}

Fk:loadTranslationTable {
  ["sp__fangtong"] = "方统",
  [":sp__fangtong"] = "锁定技，结束阶段，若你武将牌上的牌达到三十六张或更多，你所在阵营获得胜利。",
}

fangtong:addEffect(fk.EventPhaseStart, {
  can_trigger = function (self, event, target, player, data)
    return target == player and player:hasSkill(fangtong.name) and player.phase == Player.Finish and
      #player:getPile("sp__jijun") >= 36
  end,
  on_use = function (self, event, target, player, data)
    player.room:gameOver(player:getFriends(true, true))
  end,
})

return fangtong
