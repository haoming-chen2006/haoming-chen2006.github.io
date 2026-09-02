local zuoding = fk.CreateSkill {
  name = "zuoding",
}

Fk:loadTranslationTable{
  ["zuoding"] = "佐定",
  [":zuoding"] = "当其他角色于其出牌阶段内使用♠牌指定目标后，若本阶段没有角色受到过伤害，你可以令其中一名目标角色摸一张牌。",

  ["#zuoding-choose"] = "佐定：你可以令一名目标角色摸一张牌",

  ["$zuoding1"] = "只有忠心，没有谋略，是不够的。",
  ["$zuoding2"] = "承君恩宠，报效国家！",
}

zuoding:addEffect(fk.TargetSpecified, {
  anim_type = "support",
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(zuoding.name) and target ~= player and target.phase == Player.Play and data.firstTarget and
      data.card.suit == Card.Spade and
      table.find(data.use.tos, function(p)
        return not p.dead
      end) and
      #player.room.logic:getActualDamageEvents(1, Util.TrueFunc, Player.HistoryPhase) == 0
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local to = room:askToChoosePlayers(player, {
      skill_name = zuoding.name,
      min_num = 1,
      max_num = 1,
      targets = data.use.tos,
      prompt = "#zuoding-choose",
      cancelable = true,
    })
    if #to > 0 then
      event:setCostData(self, {tos = to})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    event:getCostData(self).tos[1]:drawCards(1, zuoding.name)
  end,
})

return zuoding
