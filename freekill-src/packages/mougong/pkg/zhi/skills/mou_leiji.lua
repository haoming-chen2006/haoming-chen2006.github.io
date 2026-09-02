local mouLeiji = fk.CreateSkill({
  name = "mou__leiji",
})

Fk:loadTranslationTable{
  ["mou__leiji"] = "雷击",
  [":mou__leiji"] = "出牌阶段，你可以移去4个“道兵”标记，对一名其他角色造成1点雷电伤害。",
  ["#mou__leiji"] = "雷击：移去4个“道兵”，对一名其他角色造成1点雷电伤害！",

  ["@daobing"] = "道兵",

  ["$mou__leiji1"] = "云涌风起，雷电聚集！",
  ["$mou__leiji2"] = "乾坤无极，风雷受命！",
}

mouLeiji:addEffect("active", {
  anim_type = "offensive",
  prompt = "#mou__leiji",
  can_use = function(self, player)
    return player:getMark("@daobing") >= 4
  end,
  card_num = 0,
  card_filter = Util.FalseFunc,
  target_num = 1,
  target_filter = function(self, player, to_select, selected)
    return #selected == 0 and to_select ~= player
  end,
  on_use = function(self, room, effect)
    local player = effect.from
    local to = effect.tos[1]
    room:removePlayerMark(player, "@daobing", 4)
    room:damage { from = player, to = to, damage = 1, skillName = mouLeiji.name, damageType = fk.ThunderDamage }
  end,
})

return mouLeiji
