local sidi = fk.CreateSkill {
  name = "sidi",
  derived_piles = "sidi",
}

Fk:loadTranslationTable{
  ["sidi"] = "司敌",
  [":sidi"] = "当你使用【闪】或其他角色在你的回合内使用【闪】时，你可以将牌堆顶的一张牌置于你的武将牌上；一名其他角色的出牌阶段开始时，"..
  "你可以将你武将牌上的一张牌置入弃牌堆，然后该角色本阶段可使用【杀】的次数上限-1。",

  ["#sidi-invoke"] = "司敌：你可以将一张“司敌”牌置入弃牌堆，令 %dest 本阶段使用【杀】次数上限-1",

  ["$sidi1"] = "筑城固守，司敌备战。",
  ["$sidi2"] = "徒手制敌，能奈我何？"
}

sidi:addEffect(fk.CardUseFinished, {
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(sidi.name) and data.card.name == "jink" and
      (target == player or player.room.current == player)
  end,
  on_use = function(self, event, target, player, data)
    player:addToPile(sidi.name, player.room:getNCards(1), true, sidi.name)
  end,
})

sidi:addEffect(fk.EventPhaseStart, {
  anim_type = "control",
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(sidi.name) and target ~= player and target.phase == Player.Play and
      #player:getPile(sidi.name) > 0
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local card = room:askToCards(player, {
      min_num = 1,
      max_num = 1,
      include_equip = false,
      skill_name = sidi.name,
      pattern = ".|.|.|sidi",
      prompt = "#sidi-invoke::" .. target.id,
      expand_pile = sidi.name,
    })
    if #card > 0 then
      event:setCostData(self, {tos = {target}, cards = card})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    room:setPlayerMark(target, MarkEnum.SlashResidue.."-phase", target:getMark(MarkEnum.SlashResidue.."-phase") - 1)
    local cards = event:getCostData(self).cards
    room:moveCardTo(cards, Card.DiscardPile, nil, fk.ReasonPutIntoDiscardPile, sidi.name, nil, true, player)
  end,
})

return sidi
