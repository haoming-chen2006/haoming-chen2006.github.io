Fk:loadTranslationTable{
  ["ex__guanxing"] = "观星",
  [":ex__guanxing"] = "准备阶段，你可以观看牌堆顶5张牌（场上存活角色数小于4时改为3张），并以任意顺序置于牌堆顶或牌堆顶。若你将这些牌均放至"..
  "牌堆底，则结束阶段你可以发动〖观星〗。",

  ["$ex__guanxing1"] = "天星之变，吾窥探一二。",
  ["$ex__guanxing2"] = "星途莫测，细细推敲。",
}

local guanxing = fk.CreateSkill{
  name = "ex__guanxing",
}

guanxing:addEffect(fk.EventPhaseStart, {
  anim_type = "control",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(guanxing.name) and
    (player.phase == Player.Start or (player.phase == Player.Finish and player:getMark("guanxing-turn") > 0))
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local result = room:askToGuanxing(player, { cards = room:getNCards(#room.alive_players < 4 and 3 or 5) })
    if #result.top == 0 and player.phase == Player.Start then
      room:setPlayerMark(player, "guanxing-turn", 1)
    end
  end,
})

return guanxing
