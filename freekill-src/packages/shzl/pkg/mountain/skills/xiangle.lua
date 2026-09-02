local xiangle = fk.CreateSkill {
  name = "xiangle",
  tags = {Skill.Compulsory},
}

Fk:loadTranslationTable{
  ["xiangle"] = "享乐",
  [":xiangle"] = "锁定技，当你成为【杀】的目标后，你令使用者选择：1.弃置一张基本牌；2.此【杀】对你无效。",

  ["#xiangle-discard"] = "享乐：你须弃置一张基本牌，否则此【杀】对 %src 无效",

  ["$xiangle1"] = "打打杀杀，真没意思。",
  ["$xiangle2"] = "我爸爸是刘备！",
}

xiangle:addEffect(fk.TargetConfirmed, {
  anim_type = "defensive",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(xiangle.name) and data.card.trueName == "slash"
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    if data.from.dead or #room:askToDiscard(data.from, {
      min_num = 1,
      max_num = 1,
      include_equip = false,
      skill_name = xiangle.name,
      cancelable = true,
      pattern = ".|.|.|.|.|basic",
      prompt = "#xiangle-discard:"..player.id,
    }) == 0 then
      data.nullified = true
    end
  end,
})

return xiangle
