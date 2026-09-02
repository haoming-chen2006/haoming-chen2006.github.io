local aozhan = fk.CreateSkill {
  name = "hulao__aozhan",
  tags = { Skill.Compulsory },
}

Fk:loadTranslationTable {
  ["hulao__aozhan"] = "鏖战",
  [":hulao__aozhan"] = "锁定技，若你装备区里有：武器牌，你可以多使用一张【杀】；防具牌，防止你受到的超过1点的伤害；"..
  "坐骑牌，摸牌阶段多摸一张牌；宝物牌，跳过你的判定阶段。",
}

aozhan:addEffect(fk.DrawNCards, {
  anim_type = "drawcard",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(aozhan.name) and
      (#player:getEquipments(Card.SubtypeOffensiveRide) > 0 or
      #player:getEquipments(Card.SubtypeDefensiveRide) > 0)
  end,
  on_use = function(self, event, target, player, data)
    data.n = data.n + 1
  end,
})

aozhan:addEffect(fk.DetermineDamageInflicted, {
  anim_type = "offensive",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(aozhan.name) and
      #player:getEquipments(Card.SubtypeArmor) > 0 and data.damage > 1
  end,
  on_use = function(self, event, target, player, data)
    data:changeDamage(1 - data.damage)
  end,
})

aozhan:addEffect(fk.EventPhaseChanging, {
  anim_type = "offensive",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(aozhan.name) and
      data.phase == Player.Judge and #player:getEquipments(Card.SubtypeTreasure) > 0 and not data.skipped
  end,
  on_use = function(self, event, target, player, data)
    data.skipped = true
  end,
})

aozhan:addEffect("targetmod", {
  residue_func = function(self, player, skill, scope)
    if
      player:hasSkill(aozhan.name) and
      #player:getEquipments(Card.SubtypeWeapon) > 0 and
      skill.trueName == "slash_skill" and
      scope == Player.HistoryPhase
    then
      return 1
    end
  end,
})

return aozhan
