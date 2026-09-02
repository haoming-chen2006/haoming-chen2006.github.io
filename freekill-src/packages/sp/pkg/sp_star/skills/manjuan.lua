local manjuan = fk.CreateSkill {
  name = "manjuan",
}

Fk:loadTranslationTable{
  ["manjuan"] = "漫卷",
  [":manjuan"] = "每当你将获得任何一张牌，将之置于弃牌堆。若此情况处于你的回合中，你可依次将与该牌点数相同的一张牌从弃牌堆置于你手上。",

  ["#manjuan-invoke"] = "漫卷：你可以从弃牌堆中依次选择相同点数的牌置入手牌",

  ["$manjuan1"] = "漫卷纵酒，白首狂歌。",
  ["$manjuan2"] = "吾有雄才，漫天卷地。",
}

manjuan:addEffect(fk.BeforeCardsMove, {
  mute = true,
  can_trigger = function(self, event, target, player, data)
    if player:hasSkill(manjuan.name) then
      for _, move in ipairs(data) do
        if move.to == player and move.toArea == Card.PlayerHand then
          return move.skillName ~= manjuan.name and move.skillName ~= "zuixiang"
        end
      end
    end
  end,
  on_cost = Util.TrueFunc,
  on_use = function(self, event, target, player, data)
    local room = player.room
    for _, move in ipairs(data) do
      if move.to == player and move.toArea == Card.PlayerHand and
        move.skillName ~= manjuan.name and move.skillName ~= "zuixiang" then
        move.to = nil
        move.toArea = Card.DiscardPile
        move.moveReason = fk.ReasonPutIntoDiscardPile
        if room.current == player then
          player:broadcastSkillInvoke(manjuan.name)
          room:notifySkillInvoked(player, manjuan.name, "special")
          move.extra_data = move.extra_data or {}
          move.extra_data.manjuan = player.id
        else
          player:broadcastSkillInvoke(manjuan.name)
          room:notifySkillInvoked(player, manjuan.name, "negative")
        end
      end
    end
  end,
})

manjuan:addEffect(fk.AfterCardsMove, {
  mute = true,
  can_trigger = function(self, event, target, player, data)
    if player:hasSkill(manjuan.name) then
      for _, move in ipairs(data) do
        if move.toArea == Card.DiscardPile and
          move.extra_data and move.extra_data.manjuan and move.extra_data.manjuan == player.id then
          return true
        end
      end
    end
  end,
  on_cost = function(self, event, target, player, data)
    return player.room:askToSkillInvoke(player, {
      skill_name = manjuan.name,
      prompt = "#manjuan-invoke"
    })
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    for _, move in ipairs(data) do
      if move.toArea == Card.DiscardPile and
        move.extra_data and move.extra_data.manjuan and move.extra_data.manjuan == player.id then
        player:broadcastSkillInvoke(manjuan.name)
        room:notifySkillInvoked(player, manjuan.name, "drawcard")
        for _, info in ipairs(move.moveInfo) do
          local cards = table.filter(room.discard_pile, function(id)
            return Fk:getCardById(id, true).number == Fk:getCardById(info.cardId, true).number
          end)
          if #cards > 0 then
          local ids = room:askToChooseCards(player, {
            skill_name = manjuan.name,
            min = 0,
            max = 1,
            target = player,
            flag = { card_data = {{"pile_discard", cards}} },
          })
          if #ids > 0 then
              room:moveCards({
              ids = ids,
              fromArea = Card.DiscardPile,
              to = player,
              toArea = Card.PlayerHand,
              moveReason = fk.ReasonJustMove,
              skillName = manjuan.name,
              moveVisible = true,
            })
          end
          end
        end
      end
    end
  end,
})

return manjuan
