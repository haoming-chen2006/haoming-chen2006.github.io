local mouJushou = fk.CreateSkill({
  name = "mou__jushou",
})

Fk:loadTranslationTable{
  ["mou__jushou"] = "据守",
  ["#mou__jushou_shibei"] = "据守",
  ["#mou__jushou_draw"] = "据守",
  [":mou__jushou"] = "①出牌阶段限一次，若你的武将牌正面朝上，你可以翻面、" ..
    "弃置至多两张牌并获得等量的护甲。<br/>" ..
    "②当你受到伤害后，若你的武将牌背面朝上，你可以选择一项：" ..
    "1.翻面；2.获得1点护甲。<br/>" ..
    "③当你的武将牌从背面翻至正面时，你摸等同于你护甲值的牌。",
  ["#mou__jushou"] = "据守：你可以选择弃置至多两张牌，然后翻面，弃置所选牌并获得等量护甲",
  ["add1shield"] = "获得1点护甲",

  ["$mou__jushou1"] = "白马沉河共歃誓，怒涛没城亦不悔！",
  ["$mou__jushou2"] = "山水速疾来去易，襄樊镇固永难开！",
  ["$mou__jushou3"] = "汉水溢流断归路，守城之志穷且坚！",
}

mouJushou:addEffect("active", {
  prompt = "#mou__jushou",
  mute = true,
  can_use = function(self, player)
    return player:usedEffectTimes(self.name, Player.HistoryPhase) == 0 and player.faceup
  end,
  target_num = 0,
  min_card_num = 1,
  max_card_num = 2,
  card_filter = function (self, player, to_select, selected)
    return #selected < 2 and not player:prohibitDiscard(to_select)
  end,
  on_use = function(self, room, effect)
    ---@type string
    local skillName = mouJushou.name
    local from = effect.from
    from:broadcastSkillInvoke(skillName, 1)
    room:notifySkillInvoked(from, skillName, "defensive")
    from:turnOver()

    room:throwCard(effect.cards, skillName, from, from)
    room:changeShield(from, #effect.cards)
  end,
})

mouJushou:addEffect(fk.Damaged, {
  mute = true,
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(mouJushou.name) and not player.faceup
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local choices = { "turnOver", "add1shield", "Cancel" }
    if player.shield >= 5 then table.removeOne(choices, "add1shield") end
    local choice = room:askToChoice(player, { choices = choices, skill_name = mouJushou.name })
    if choice ~= "Cancel" then
      event:setCostData(self, choice)
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    ---@type string
    local skillName = mouJushou.name
    local room = player.room
    player:broadcastSkillInvoke(skillName, 2)
    room:notifySkillInvoked(player, skillName, "masochism")
    if event:getCostData(self) == "turnOver" then
      player:turnOver()
    else
      room:changeShield(player, 1)
    end
  end,
})

mouJushou:addEffect(fk.TurnedOver, {
  mute = true,
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(mouJushou.name) and player.faceup
  end,
  on_cost = Util.TrueFunc,
  on_use = function(self, event, target, player, data)
    ---@type string
    local skillName = mouJushou.name
    local room = player.room
    player:broadcastSkillInvoke(skillName, 3)
    room:notifySkillInvoked(player, skillName, "drawcard")
    player:drawCards(player.shield, skillName)
  end,
})

return mouJushou
