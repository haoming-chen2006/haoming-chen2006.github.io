local dailao = fk.CreateSkill {
  name = "js__dailao",
}

Fk:loadTranslationTable{
  ["js__dailao"] = "待劳",
  [":js__dailao"] = "出牌阶段，若你没有可以使用的手牌，你可以展示所有手牌并摸两张牌，然后结束回合。",

  ["#js__dailao"] = "待劳：你可以展示所有手牌并摸两张牌，然后结束回合",
}

dailao:addEffect("active", {
  anim_type = "drawcard",
  prompt = "#js__dailao",
  can_use = function(self, player)
    return not player:isKongcheng() and
      table.every(player:getCardIds("h"), function (id)
      return #Fk:getCardById(id):getAvailableTargets(player) == 0
    end)
  end,
  target_num = 0,
  card_num = 0,
  card_filter = Util.FalseFunc,
  on_use = function(self, room, effect)
    local player = effect.from
    player:showCards(player:getCardIds("h"))
    if player.dead then return end
    player:drawCards(2, dailao.name)
    if player.dead then return end
    room:endTurn()
  end,
})

return dailao
