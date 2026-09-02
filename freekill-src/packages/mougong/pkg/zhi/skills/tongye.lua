local tongye = fk.CreateSkill({
  name = "mou__tongye",
  tags = { Skill.Compulsory },
})

Fk:loadTranslationTable{
  ["mou__tongye"] = "统业",
  [":mou__tongye"] = "锁定技，回合结束时，若你每个区域都能于场上找到牌数相同的其他角色的对应区域，你随机获得一张牌（每种牌名限一次）。",

  ["$mou__tongye1"] = "上下一心，君臣同志。",
  ["$mou__tongye2"] = "胸有天下者，必可得其国。",
}

tongye:addEffect(fk.TurnEnd, {
  anim_type = "drawcard",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(tongye.name) and
      table.every({ "h", "e", "j" }, function (area)
        return table.find(player.room:getOtherPlayers(player, false), function (p)
          return #player:getCardIds(area) == #p:getCardIds(area)
        end) ~= nil
      end)
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local ids = {}
    for _, id in ipairs(room.draw_pile) do
      if not table.contains(player:getTableMark(tongye.name), Fk:getCardById(id).trueName) then
        table.insert(ids, id)
      end
    end
    if #ids > 0 then
      local id = room:tableRandomPick(ids)
      room:addTableMark(player, tongye.name, Fk:getCardById(id).trueName)
      room:moveCardTo(id, Card.PlayerHand, player, fk.ReasonJustMove, tongye.name, nil, false, player)
    end
  end,
})

return tongye
