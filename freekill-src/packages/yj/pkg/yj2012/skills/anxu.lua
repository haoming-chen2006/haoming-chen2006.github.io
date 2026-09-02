local anxu = fk.CreateSkill {
  name = "anxu",
}

Fk:loadTranslationTable{
  ["anxu"] = "安恤",
  [":anxu"] = "出牌阶段限一次，你可以选择两名手牌数不相等的其他角色，令其中手牌少的角色获得手牌多的角色一张手牌（正面朝上移动），"..
  "若此牌的花色不为♠，你摸一张牌。",

  ["#anxu"] = "安恤：选择两名手牌数不同的角色，手牌少的角色获得另一名角色一张手牌",

  ["$anxu1"] = "和鸾雍雍，万福攸同。",
  ["$anxu2"] = "君子乐胥，万邦之屏。",
}

anxu:addEffect("active", {
  anim_type = "control",
  prompt = "#anxu",
  card_num = 0,
  target_num = 2,
  can_use = function(self, player)
    return player:usedSkillTimes(anxu.name, Player.HistoryPhase) == 0
  end,
  card_filter = Util.FalseFunc,
  target_filter = function(self, player, to_select, selected)
    if #selected > 1 or to_select == player then return end
    if #selected == 0 then
      return true
    elseif #selected == 1 then
      return to_select:getHandcardNum() ~= selected[1]:getHandcardNum()
    end
  end,
  on_use = function(self, room, effect)
    local player = effect.from
    local from, to = effect.tos[1], effect.tos[2]
    if from:getHandcardNum() > to:getHandcardNum() then
      from, to = to, from
    end
    local card = room:askToChooseCard(from, {
      target = to,
      flag = "h",
      skill_name = anxu.name,
    })
    local yes = Fk:getCardById(card).suit ~= Card.Spade
    room:moveCardTo(card, Card.PlayerHand, from, fk.ReasonPrey, anxu.name, nil, true, from)
    if yes and not player.dead then
      player:drawCards(1, anxu.name)
    end
  end,
})

return anxu