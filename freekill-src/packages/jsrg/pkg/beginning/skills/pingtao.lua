local pingtao = fk.CreateSkill {
  name = "pingtao",
}

Fk:loadTranslationTable{
  ["pingtao"] = "平讨",
  [":pingtao"] = "出牌阶段限一次，你可以令一名其他角色选择一项：1.交给你一张牌，然后你此阶段使用【杀】次数上限+1；"..
  "2.令你视为对其使用一张无距离和次数限制的【杀】。",

  ["#pingtao"] = "平讨：令一名角色选择交给你一张牌或视为你对其使用【杀】",
  ["#pingtao-card"] = "平讨：交给 %src 一张牌令其可以多使用一张【杀】，或点“取消”其视为对你使用【杀】",

  ["$pingtao1"] = "平贼之功，非我莫属。",
  ["$pingtao2"] = "贼乱数郡，宜速讨灭！",
}

pingtao:addEffect("active", {
  anim_type = "offensive",
  prompt = "#pingtao",
  card_num = 0,
  target_num = 1,
  can_use = function(self, player)
    return player:usedSkillTimes(pingtao.name, Player.HistoryPhase) == 0
  end,
  card_filter = Util.FalseFunc,
  target_filter = function(self, player, to_select, selected, selected_cards)
    return #selected == 0 and to_select ~= player
  end,
  on_use = function(self, room, effect)
    local player = effect.from
    local target = effect.tos[1]
    local card = room:askToCards(target, {
      min_num = 1,
      max_num = 1,
      skill_name = pingtao.name,
      include_equip = true,
      cancelable = true,
      prompt = "#pingtao-card:"..player.id,
    })
    if #card > 0 then
      room:addPlayerMark(player, MarkEnum.SlashResidue.."-phase", 1)
      room:moveCardTo(card, Card.PlayerHand, player, fk.ReasonGive, pingtao.name, nil, false, target)
    else
      room:useVirtualCard("slash", nil, player, target, pingtao.name, true)
    end
  end,
})

return pingtao
