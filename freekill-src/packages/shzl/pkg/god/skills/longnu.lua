local longnu = fk.CreateSkill {
  name = "longnu",
  tags = { Skill.Compulsory, Skill.Switch },
}

Fk:loadTranslationTable{
  ["longnu"] = "龙怒",
  [":longnu"] = "转换技，锁定技，出牌阶段开始时，阳：你失去1点体力，摸一张牌，你的红色手牌于此阶段内均视为火【杀】，你于此阶段内使用火【杀】"..
  "无距离限制；阴：你减1点体力上限，摸一张牌，你的锦囊牌于此阶段内均视为雷【杀】，你于此阶段内使用雷【杀】无次数限制。",

  ["$longnu1"] = "损身熬心，誓报此仇！",
  ["$longnu2"] = "兄弟疾难，血债血偿！",
}

longnu:addEffect(fk.EventPhaseStart, {
  anim_type = "switch",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(longnu.name) and player.phase == Player.Play
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    if player:getSwitchSkillState(longnu.name, true) == fk.SwitchYang then
      room:loseHp(player, 1, longnu.name)
      if player.dead then return end
      player:drawCards(1, longnu.name)
      if player.dead then return end
      room:setPlayerMark(player, "_longnu-phase", "yang")
    else
      room:changeMaxHp(player, -1)
      if player.dead then return end
      player:drawCards(1, longnu.name)
      if player.dead then return end
      room:setPlayerMark(player, "_longnu-phase", "yin")
    end
  end,
})
longnu:addEffect("filter", {
  anim_type = "offensive",
  card_filter = function(self, to_select, player)
    if player:hasSkill(longnu.name) and player.phase == Player.Play and
    table.contains(player:getCardIds("h"), to_select.id) then
      if player:getMark("_longnu-phase") == "yang" then
        return to_select.color == Card.Red
      elseif player:getMark("_longnu-phase") == "yin" then
        return to_select.type == Card.TypeTrick
      end
    end
  end,
  view_as = function(self, player, to_select)
    local card
    if player:getMark("_longnu-phase") == "yang" then
      card = Fk:cloneCard("fire__slash", to_select.suit, to_select.number)
    elseif player:getMark("_longnu-phase") == "yin" then
      card = Fk:cloneCard("thunder__slash", to_select.suit, to_select.number)
    end
    card.skillName = longnu.name
    return card
  end,
})
longnu:addEffect("targetmod", {
  bypass_distances =  function(self, player, skill, card, to)
    return player:getMark("_longnu-phase") == "yang" and card and card.name == "fire__slash"
  end,
  bypass_times = function(self, player, skill, scope, card, to)
    return player:getMark("_longnu-phase") == "yin" and card and card.name == "thunder__slash"
  end,
})

return longnu
