
local tishen = fk.CreateSkill{
  name = "ex__tishen",
  tags = { Skill.Limited },
}

Fk:loadTranslationTable{
  ["ex__tishen"] = "替身",
  [":ex__tishen"] = "限定技，准备阶段，若你已受伤，则你可以将体力值回复至上限，然后摸回复数值张牌。",

  ["#tishen-invoke"] = "替身：你可以回复%arg点体力并摸%arg张牌",

  ["$ex__tishen1"] = "欺我无谋，定要尔等血偿！",
  ["$ex__tishen2"] = "谁，还敢过来一战！？",
}

tishen:addEffect(fk.EventPhaseStart, {
  anim_type = "drawcard",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(tishen.name) and player.phase == Player.Start and
      player:isWounded() and player:usedSkillTimes(tishen.name, Player.HistoryGame) == 0
  end,
  on_cost = function(self, event, target, player, data)
    local maxHp = player.maxHp - player.hp
    return player.room:askToSkillInvoke(player, {
      skill_name = tishen.name,
      prompt = "#tishen-invoke:::"..maxHp,
    })
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local n = player.maxHp - player.hp
    room:recover{
      who = player,
      num = n,
      recoverBy = player,
      skillName = tishen.name,
    }
    if not player.dead then
      player:drawCards(n, tishen.name)
    end
  end,
})

return tishen
