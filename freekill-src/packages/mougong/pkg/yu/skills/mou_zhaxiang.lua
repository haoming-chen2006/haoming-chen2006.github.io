local mouZhaxiang = fk.CreateSkill({
  name = "mou__zhaxiang",
  tags = { Skill.Compulsory },
})

Fk:loadTranslationTable{
  ["mou__zhaxiang"] = "诈降",
  [":mou__zhaxiang"] = "锁定技，①摸牌阶段，你的摸牌基数+X；②出牌阶段，你使用的前X张牌无距离和次数限制且无法响应（X为你已损失的体力值）。",
  ["@[mou__zhaxiang]"] = "诈降 剩余",

  ["$mou__zhaxiang1"] = "江东六郡之卒，怎敌丞相百万雄师！",
  ["$mou__zhaxiang2"] = "闻丞相虚心纳士，盖愿率众归降！",
}

mouZhaxiang:addEffect(fk.DrawNCards, {
  anim_type = "drawcard",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(mouZhaxiang.name) and player:isWounded()
  end,
  on_use = function(self, event, target, player, data)
    data.n = data.n + player:getLostHp()
  end,
})

Fk:addQmlMark{
  name = "mou__zhaxiang",
  qml_path = "",
  how_to_show = function(name, value, p)
    if p.phase == Player.Play then
      local x = p:getLostHp() - p:getMark("mou__zhaxiang-phase")
      if x > 0 then
        return tostring(x)
      end
    end
    return "#hidden"
  end,
}

mouZhaxiang:addEffect(fk.TargetSpecified, {
  mute = true,
  can_trigger = function(self, event, target, player, data)
    return
      target == player and
      player.phase == Player.Play and
      player:hasSkill(mouZhaxiang.name) and
      data.card.type ~=Card.TypeEquip and
      player:getMark("mou__zhaxiang-phase") <= player:getLostHp()
  end,
  on_use = function(self, event, target, player, data)
    data.disresponsive = true
  end,
})

mouZhaxiang:addEffect(fk.CardUsing, {
  can_refresh = function(self, event, target, player, data)
    return target == player and player:hasSkill(mouZhaxiang.name, true) and player.phase == Player.Play
  end,
  on_refresh = function(self, event, target, player, data)
    player.room:addPlayerMark(player, "mou__zhaxiang-phase", 1)
  end,
})

mouZhaxiang:addEffect("targetmod", {
  bypass_times = function(self, player, skill, scope, card)
    return
      card and
      player:hasSkill(mouZhaxiang.name) and
      player:getMark("mou__zhaxiang-phase") < player:getLostHp() and
      player.phase == Player.Play
  end,
  bypass_distances = function(self, player, skill, card)
    return
      card and
      player:hasSkill(mouZhaxiang.name) and
      player:getMark("mou__zhaxiang-phase") < player:getLostHp() and
      player.phase == Player.Play
  end,
})

mouZhaxiang:addAcquireEffect(function (self, player)
  player.room:setPlayerMark(player, "@[mou__zhaxiang]", 1)
end)

mouZhaxiang:addLoseEffect(function (self, player)
  player.room:setPlayerMark(player, "@[mou__zhaxiang]", 0)
end)

return mouZhaxiang
