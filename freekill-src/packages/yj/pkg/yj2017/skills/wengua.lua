local wengua = fk.CreateSkill {
  name = "wengua",
  attached_skill_name = "wengua&",
}

Fk:loadTranslationTable{
  ["wengua"] = "问卦",
  [":wengua"] = "出牌阶段限一次，你可以将一张牌置于牌堆顶或牌堆底，然后从另一端摸一张牌。其他角色的出牌阶段限一次，其可以将一张牌交给你，"..
  "然后你可以将此牌置于牌堆顶或牌堆底，你与其从另一端摸一张牌。",

  ["#wengua"] = "问卦：你可以将一张牌置于牌堆顶或牌堆底，从另一端摸一张牌",

  ["$wengua1"] = "阴阳相生相克，万事周而复始。",
  ["$wengua2"] = "卦不能佳，可须异日。",
}

wengua:addEffect("active", {
  anim_type = "support",
  prompt = "#wengua",
  card_num = 1,
  target_num = 0,
  can_use = function(self, player)
    return player:usedSkillTimes(wengua.name, Player.HistoryPhase) == 0
  end,
  interaction = UI.ComboBox {choices = {"Top", "Bottom"}},
  card_filter = function(self, player, to_select, selected)
    return #selected == 0
  end,
  on_use = function(self, room, effect)
    local player = effect.from
    local index = 1
    local fromPlace = "bottom"
    if self.interaction.data == "Bottom" then
      index = -1
      fromPlace = "top"
    end
    room:moveCards({
      ids = effect.cards,
      from = player,
      toArea = Card.DrawPile,
      moveReason = fk.ReasonPut,
      skillName = wengua.name,
      drawPilePosition = index,
    })
    if not player.dead then
      room:drawCards(player, 1, wengua.name, fromPlace)
    end
  end,
})

return wengua
