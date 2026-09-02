local mouHuangtian = fk.CreateSkill({
  name = "mou__huangtian",
  tags = { Skill.Lord, Skill.Compulsory },
})

Fk:loadTranslationTable{
  ["mou__huangtian"] = "黄天",
  [":mou__huangtian"] = "主公技，锁定技，①第一轮的你的回合开始时，你将游戏外的【太平要术】置入装备区；<br>②当其他群势力角色造成伤害后，"..
  "若你拥有技能〖鬼道〗，你获得2个“道兵”标记（每轮你至多以此法获得4个标记）。",

  ["$mou__huangtian1"] = "汝等既顺黄天，当应天公之命！",
  ["$mou__huangtian2"] = "黄天佑我，道兵显威！",
}

local peace_spell = { {"js__peace_spell", Card.Heart, 3} }

mouHuangtian:addEffect(fk.TurnStart, {
  anim_type = "support",
  can_trigger = function(self, event, target, player, data)
    local room = player.room
    return
      player:hasSkill(mouHuangtian.name) and
      target == player and
      room:getBanner("RoundCount") == 1 and
      player:hasEmptyEquipSlot(Card.SubtypeTreasure) and
      room:getCardArea(room:prepareDeriveCards(peace_spell, "huangtian_spell")[1]) == Card.Void
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local spell = room:prepareDeriveCards(peace_spell, "huangtian_spell")[1]
    room:moveCardIntoEquip(player, spell, mouHuangtian.name, true, player)
  end,
})

mouHuangtian:addEffect(fk.Damage, {
  anim_type = "support",
  can_trigger = function(self, event, target, player, data)
    return
      player:hasSkill(mouHuangtian.name) and
      target and
      target ~= player and
      target.kingdom == "qun" and
      player:hasSkill("mou__guidao", true) and
      player:getMark("@daobing") < 8 and
      player:getMark("mou__huangtian-round") < 4
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local n = math.min(2, 8 - player:getMark("@daobing"), 4 - player:getMark("mou__huangtian-round"))
    room:addPlayerMark(player, "@daobing", n)
    room:addPlayerMark(player, "mou__huangtian-round", n)
  end,
})

return mouHuangtian
