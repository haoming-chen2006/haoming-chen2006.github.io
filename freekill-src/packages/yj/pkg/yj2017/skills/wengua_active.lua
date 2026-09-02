local wengua_active = fk.CreateSkill {
  name = "wengua&"
}

Fk:loadTranslationTable{
  ["wengua&"] = "问卦",
  [":wengua&"] = "出牌阶段限一次，你可以交给徐氏一张牌，然后其可以将此牌置于牌堆顶或牌堆底，其与你从另一端摸一张牌。",

  ["#wengua&"] = "问卦：交给徐氏一张牌，其可以将此牌置于牌堆顶或牌堆底，你与其从另一端各摸一张牌",
  ["#wengua-choice"] = "问卦：你可以将 %arg 置于牌堆顶或牌堆底，然后你与 %dest 从另一端摸一张牌",
}

wengua_active:addEffect("active", {
  anim_type = "support",
  prompt = "#wengua&",
  card_num = 1,
  target_num = 1,
  can_use = function(self, player)
    local targetRecorded = player:getTableMark("wengua_targets-phase")
    return table.find(Fk:currentRoom().alive_players, function(p)
      return p ~= player and p:hasSkill("wengua", true) and not table.contains(targetRecorded, p.id)
    end)
  end,
  card_filter = function(self, player, to_select, selected)
    return #selected == 0
  end,
  target_filter = function(self, player, to_select, selected)
    return #selected == 0 and to_select ~= player and to_select:hasSkill("wengua") and
      not table.contains(player:getTableMark("wengua_targets-phase"), to_select)
  end,
  on_use = function(self, room, effect)
    local player = effect.from
    local target = effect.tos[1]
    target:broadcastSkillInvoke("wengua")
    room:addTableMarkIfNeed(player, "wengua_targets-phase", target.id)
    local id = effect.cards[1]
    room:obtainCard(target, id, false, fk.ReasonGive, player)
    if target.dead or not table.contains(target:getCardIds("h"), id) then return end
    local choices = {"Top", "Bottom", "Cancel"}
    local choice = room:askToChoice(target, {
      choices = choices,
      skill_name = "wengua",
      prompt = "#wengua-choice::"..player.id..":"..Fk:getCardById(id):toLogString(),
    })
    if choice == "Cancel" then return end
    local index = 1
    if choice == "Bottom" then
      index = -1
    end
    room:moveCards({
      ids = effect.cards,
      from = target,
      toArea = Card.DrawPile,
      moveReason = fk.ReasonJustMove,
      skillName = "wengua",
      drawPilePosition = index,
    })
    if choice == "Top" then
      if not player.dead then
        player:drawCards(1, "wengua", "bottom")
      end
      if not target.dead then
        target:drawCards(1, "wengua", "bottom")
      end
    else
      if not player.dead then
        player:drawCards(1, "wengua")
      end
      if not target.dead then
        target:drawCards(1, "wengua")
      end
    end
  end,
})

return wengua_active
