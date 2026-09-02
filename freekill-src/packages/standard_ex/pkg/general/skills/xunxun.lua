Fk:loadTranslationTable{
  ["xunxun"] = "恂恂",
  [":xunxun"] = "摸牌阶段开始时，你可以观看牌堆顶的四张牌，将其中两张牌以任意顺序置于牌堆顶，其余以任意顺序置于牌堆底。",

  ["#xunxun"] = "恂恂：选择两张卡牌置于牌堆顶",

  ["$xunxun1"] = "众将死战，非我之功。",
  ["$xunxun2"] = "爱兵如子，胜乃可全。",
}

local xunxun = fk.CreateSkill{
  name = "xunxun",
}

xunxun:addEffect(fk.EventPhaseStart, {
  anim_type = "control",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(xunxun.name) and player.phase == Player.Draw
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local ret = room:askToArrangeCards(player, {
      skill_name = xunxun.name,
      card_map = {room:getNCards(4), "Bottom", "Top"},
      prompt = "#xunxun",
      free_arrange = true,
      max_limit = {4, 2},
      min_limit = {0, 2},
    })
    local top, bottom = ret[2], ret[1]
    for i = #top, 1, -1 do
      table.removeOne(room.draw_pile, top[i])
      table.insert(room.draw_pile, 1, top[i])
    end
    for i = 1, #bottom, 1 do
      table.removeOne(room.draw_pile, bottom[i])
      table.insert(room.draw_pile, bottom[i])
    end
    room:sendLog{
      type = "#GuanxingResult",
      from = player.id,
      arg = #top,
      arg2 = #bottom,
    }
  end,
})

return xunxun
