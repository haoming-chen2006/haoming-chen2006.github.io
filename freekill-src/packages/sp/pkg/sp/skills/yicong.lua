local yicong = fk.CreateSkill {
  name = "yicong",
  tags = { Skill.Compulsory },
}

Fk:loadTranslationTable{
  ["yicong"] = "义从",
  [":yicong"] = "锁定技，只要你的体力值大于2点，你计算与其他角色的距离时始终-1；只要你的体力值为2点或更低，其他角色计算与你的距离时始终+1。",

  ["$yicong1"] = "冲啊！",
  ["$yicong2"] = "众将听令，排好阵势，御敌！",
}

yicong:addEffect("distance", {
  correct_func = function(self, from, to)
    if from:hasSkill(yicong.name) and from.hp > 2 then
      return -1
    end
    if to:hasSkill(yicong.name) and to.hp < 3 then
      return 1
    end
    return 0
  end,
})

yicong:addEffect(fk.HpChanged, {
  can_refresh = function(self, event, target, player, data)
    return target == player and player:hasSkill(yicong.name) and not player:isFakeSkill(yicong.name)
  end,
  on_refresh = function(self, event, target, player, data)
    local room = player.room
    if player.hp > 2 and data.num > 0 and player.hp - data.num < 3 then
      room:notifySkillInvoked(player, yicong.name, "offensive")
      player:broadcastSkillInvoke(yicong.name, 1)
    elseif player.hp < 3 and data.num < 0 and player.hp - data.num > 2 then
      room:notifySkillInvoked(player, yicong.name, "defensive")
      player:broadcastSkillInvoke(yicong.name, 2)
    end
  end,
})

return yicong
