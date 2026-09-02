local shizhi = fk.CreateSkill {
  name = "shizhi",
  tags = { Skill.Compulsory },
}

Fk:loadTranslationTable{
  ["shizhi"] = "矢志",
  [":shizhi"] = "锁定技，若你的体力值为1，你的【闪】视为【杀】。",
}

shizhi:addAcquireEffect(function (self, player, is_start)
  player:filterHandcards()
end)
shizhi:addLoseEffect(function (self, player, is_death)
  player:filterHandcards()
end)


shizhi:addEffect("filter", {
  anim_type = "offensive",
  card_filter = function(self, card, player, isJudgeEvent)
    return player:hasSkill(shizhi.name) and player.hp == 1 and card.name == "jink" and
      table.contains(player:getCardIds("h"), card.id)
  end,
  view_as = function(self, player, to_select)
    return Fk:cloneCard("slash", to_select.suit, to_select.number)
  end,
})

local spec = {
  can_refresh = function(self, event, target, player, data)
    return target == player and player:hasSkill(shizhi.name, true)
  end,
  on_refresh = function(self, event, target, player, data)
    player:filterHandcards()
  end,
}

shizhi:addEffect(fk.HpChanged, spec)
shizhi:addEffect(fk.MaxHpChanged, spec)

return shizhi
