local mouJiewei = fk.CreateSkill({
  name = "mou__jiewei",
})

Fk:loadTranslationTable{
  ["mou__jiewei"] = "解围",
  [":mou__jiewei"] = "出牌阶段限一次，你可以失去1点护甲并选择一名其他角色，你观看其手牌并获得其中一张。",
  ["#mou__jiewei"] = "解围：你可失去1点护甲，观看一名其他角色的手牌并获得一张",

  ["$mou__jiewei1"] = "同袍之谊，断不可弃之！",
  ["$mou__jiewei2"] = "贼虽势盛，若吾出马，亦可解之。",
}

mouJiewei:addEffect("active", {
  can_use = function(self, player)
    return player:usedSkillTimes(mouJiewei.name, Player.HistoryPhase) == 0 and player.shield > 0
  end,
  target_num = 1,
  card_num = 0,
  card_filter = Util.FalseFunc,
  prompt = "#mou__jiewei",
  target_filter = function(self, player, to_select, selected)
    return #selected == 0 and to_select ~= player and not to_select:isKongcheng()
  end,
  on_use = function(self, room, effect)
    ---@type string
    local skillName = mouJiewei.name
    local player = effect.from
    room:changeShield(player, -1)
    local target = effect.tos[1]
    local card = room:askToChooseCard(
      player,
      {
        target = target,
        flag = { card_data = { { "$Hand", target.player_cards[Player.Hand] } } },
        skill_name = skillName,
      }
    )
    room:obtainCard(player, card, false, fk.ReasonPrey, player.id, skillName)
  end,
})

return mouJiewei
