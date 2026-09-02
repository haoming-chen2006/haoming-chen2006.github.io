Fk:loadTranslationTable{
  ["ex__qingjian"] = "清俭",
  [":ex__qingjian"] = "每回合限一次，当你于摸牌阶段外获得牌后，你可以展示任意张牌并交给一名其他角色。当前回合角色本回合手牌上限+X（X为你"..
  "展示牌的类别数）。",

  ["#ex__qingjian-invoke"] = "清俭：你可以将任意张牌交给一名其他角色，并令 %dest 手牌上限增加",

  ["$ex__qingjian1"] = "福生于清俭，德生于卑退。",
  ["$ex__qingjian2"] = "钱财，乃身外之物。",
}

local qingjian = fk.CreateSkill{
  name = "ex__qingjian",
}

qingjian:addEffect(fk.AfterCardsMove, {
  anim_type = "support",
  can_trigger = function(self, event, target, player, data)
    if player:hasSkill(qingjian.name) and player:usedSkillTimes(qingjian.name, Player.HistoryTurn) == 0 and
      not player:isNude() and player.phase ~= Player.Draw then
      for _, move in ipairs(data) do
        if move.to == player and move.toArea == Player.Hand then
          return #player.room:getOtherPlayers(player, false) > 0
        end
      end
    end
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local tos, cards = room:askToChooseCardsAndPlayers(player, {
      min_card_num = 1,
      max_card_num = #player:getCardIds("he"),
      targets = room:getOtherPlayers(player, false),
      min_num = 1,
      max_num = 1,
      prompt = "#ex__qingjian-invoke::"..room.current.id,
      skill_name = qingjian.name,
      cancelable = true,
      no_indicate = true,
    })
    if #tos > 0 and #cards > 0 then
      event:setCostData(self, {tos = tos, cards = cards})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local cards = event:getCostData(self).cards
    local types = {}
    for _, id in ipairs(cards) do
      table.insertIfNeed(types, Fk:getCardById(id).type)
    end
    room:moveCardTo(cards, Player.Hand, event:getCostData(self).tos[1], fk.ReasonGive, qingjian.name, nil, true, player)
    if not room.current.dead then
      room:addPlayerMark(room.current, MarkEnum.AddMaxCardsInTurn, #types)
    end
  end,
})

return qingjian
