local biyue = fk.CreateSkill({
  name = "mou__biyue",
  tags = { Skill.Compulsory },
})

Fk:loadTranslationTable{
  ["mou__biyue"] = "闭月",
  [":mou__biyue"] = "锁定技，结束阶段，你摸X张牌（X为本回合受到过伤害的角色数+1，至多为4）。",

  ["$mou__biyue1"] = "薄酒醉红颜，广袂羞掩面。",
  ["$mou__biyue2"] = "芳草更芊芊，荷池映玉颜。",
}

biyue:addEffect(fk.EventPhaseStart, {
  anim_type = "drawcard",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(biyue.name) and player.phase == Player.Finish
  end,
  on_use = function(self, event, target, player, data)
    local targets = {}
    player.room.logic:getActualDamageEvents(999, function(e)
      table.insertIfNeed(targets, e.data.to)
      return false
    end, Player.HistoryTurn)
    player:drawCards(math.min(1 + #targets, 4), self.name)
  end,
})

return biyue
