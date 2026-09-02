Fk:loadTranslationTable{
  ["ex__lianying"] = "连营",
  [":ex__lianying"] = "当你失去手牌后，若你没有手牌，则你可以令至多X名角色各摸一张牌（X为你此次失去的手牌数）。",

  ["#ex__lianying-invoke"] = "连营：你可令至多%arg名角色摸一张牌",

  ["$ex__lianying1"] = "生生不息，源源不绝。",
  ["$ex__lianying2"] = "失之淡然，得之坦然。",
}

local lianying = fk.CreateSkill{
  name = "ex__lianying",
}

lianying:addEffect(fk.AfterCardsMove, {
  anim_type = "drawcard",
  can_trigger = function(self, event, target, player, data)
    if not (player:hasSkill(lianying.name) and player:isKongcheng()) then return false end
    for _, move in ipairs(data) do
      if move.from == player then
        for _, info in ipairs(move.moveInfo) do
          if info.fromArea == Card.PlayerHand then
            return true
          end
        end
      end
    end
  end,
  on_cost = function (self, event, target, player, data)
    local room = player.room
    local n = 0
    for _, move in ipairs(data) do
      if move.from == player then
        for _, info in ipairs(move.moveInfo) do
          if info.fromArea == Card.PlayerHand then
            n = n + 1
            if n >= #room.alive_players then
              break
            end
          end
        end
      end
    end
    local tos = room:askToChoosePlayers(player, {
      targets = room.alive_players,
      min_num = 1,
      max_num = n,
      prompt = "#ex__lianying-invoke:::"..n,
      skill_name = lianying.name
    })
    if #tos > 0 then
      room:sortByAction(tos)
      event:setCostData(self, {tos = tos})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    for _, p in ipairs(event:getCostData(self).tos) do
      if not p.dead then
        p:drawCards(1, lianying.name)
      end
    end
  end,
})

return lianying
