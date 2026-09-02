local yingshi = fk.CreateSkill {
  name = "js__yingshi",
}

Fk:loadTranslationTable {
  ["js__yingshi"] = "鹰视",
  [":js__yingshi"] = "当你翻面后，你可以观看牌堆底的三张牌（若场上阵亡角色数大于2则改为五张），以任意顺序置于牌堆顶或牌堆底。",

  ["$js__yingshi1"] = "亮志大而不见机，已堕吾画中。",
  ["$js__yingshi2"] = "贼偏执一端不能察变，破之必矣。",
}

yingshi:addEffect(fk.TurnedOver, {
  anim_type = "control",
  on_use = function(self, event, target, player, data)
    local room = player.room
    local n = #table.filter(room.players, function(p)
      return p.dead
    end) > 2 and 5 or 3
    local cards = room:getNCards(n, "bottom")
    local result = room:askToArrangeCards(player, {
      skill_name = yingshi.name,
      card_map = {
        {}, cards, "Top", "Bottom" },
      box_size = 5,
      max_limit = { 5, 5 },
      min_limit = { 0, 0 },
      free_arrange = true,
    })

    local top, bottom
    top = result[1]
    bottom = result[2]

    local moveInfos = {}
    if #top > 0 then
      table.insert(moveInfos, { ---@type CardsMoveInfo
        ids = table.reverse(top),
        toArea = Card.DrawPile,
        moveReason = fk.ReasonPut,
        proposer = player,  
        skillName = yingshi.name,
        moveVisible = false,
        visiblePlayers = player
      })
    end
    if #bottom > 0 then
      table.insert(moveInfos, { ---@type CardsMoveInfo
        ids = bottom,
        toArea = Card.DrawPile,
        moveReason = fk.ReasonPut,
        proposer = player,
        skillName = yingshi.name,
        drawPilePosition = -1,
        moveVisible = false,
        visiblePlayers = player,
      })
    end
    room:moveCards(table.unpack(moveInfos))
  end,
})

return yingshi
