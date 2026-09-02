local kuangfeng = fk.CreateSkill {
  name = "kuangfeng",
}

Fk:loadTranslationTable{
  ["kuangfeng"] = "狂风",
  [":kuangfeng"] = "结束阶段，你可以将一张“星”置入弃牌堆并选择一名角色，当其于你的下回合开始之前受到火焰伤害时，你令伤害值+1。",

  ["@@kuangfeng"] = "狂风",
  ["#kuangfeng-invoke"] = "狂风：将一张“星”置入弃牌堆并选择一名角色，其受到火焰伤害+1直到你下回合开始",

  ["$kuangfeng1"] = "风~~起~~",
  ["$kuangfeng2"] = "万事俱备，只欠业火。",
}

kuangfeng:addEffect(fk.EventPhaseStart, {
  anim_type = "offensive",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(kuangfeng.name) and player.phase == Player.Finish and #player:getPile("$star") > 0
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local tos, card = room:askToChooseCardsAndPlayers(player, {
      min_num = 1,
      max_num = 1,
      min_card_num = 1,
      max_card_num = 1,
      targets = room.alive_players,
      pattern = ".|.|.|$star",
      skill_name = kuangfeng.name,
      prompt = "#kuangfeng-invoke",
      cancelable = true,
      expand_pile = player:getPile("$star")
    })
    if #tos > 0 and #card > 0 then
      event:setCostData(self, { tos = tos, cards = card })
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    room:addPlayerMark(event:getCostData(self).tos[1], "@@kuangfeng")
    room:setPlayerMark(player, "_kuangfeng", event:getCostData(self).tos[1].id)
    room:moveCardTo(event:getCostData(self).cards, Card.DiscardPile, nil, fk.ReasonPutIntoDiscardPile, kuangfeng.name)
  end,
})
kuangfeng:addEffect(fk.DamageInflicted, {
  anim_type = "offensive",
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(kuangfeng.name) and target:getMark("@@kuangfeng") > 0 and
      data.damageType == fk.FireDamage and player:getMark("_kuangfeng") == target.id
  end,
  on_cost = Util.TrueFunc,
  on_use = function (self, event, target, player, data)
    data:changeDamage(1)
  end,
})

local clean_spec = {
  can_refresh = function(self, event, target, player, data)
    return target == player and player:getMark("_kuangfeng") ~= 0
  end,
  on_refresh = function(self, event, target, player, data)
    local room = player.room
    room:removePlayerMark(room:getPlayerById(player:getMark("_kuangfeng")), "@@kuangfeng")
    room:setPlayerMark(player, "_kuangfeng", 0)
  end,
}
kuangfeng:addEffect(fk.TurnStart, clean_spec)
kuangfeng:addEffect(fk.Death, clean_spec)

return kuangfeng
