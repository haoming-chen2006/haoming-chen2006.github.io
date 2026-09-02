local zhengbing = fk.CreateSkill {
  name = "zhengbing",
  tags = { Skill.AttachedKingdom },
  attached_kingdom = {"qun"},
}

Fk:loadTranslationTable{
  ["zhengbing"] = "整兵",
  [":zhengbing"] = "群势力技，出牌阶段限三次，你可以重铸一张牌，若此牌为：<br>"..
  "【杀】，你此回合手牌上限+2；<br>【闪】，你摸一张牌；<br>【桃】，你变更势力至魏。",

  ["#zhengbing"] = "整兵：你可以重铸一张牌，若为基本牌，获得额外效果",
}

zhengbing:addEffect("active", {
  anim_type = "drawcard",
  card_num = 1,
  target_num = 0,
  prompt = "#zhengbing",
  times = function(self, player)
    return player.phase == Player.Play and 3 - player:usedSkillTimes(zhengbing.name, Player.HistoryPhase) or -1
  end,
  can_use = function(self, player)
    return player:usedSkillTimes(zhengbing.name, Player.HistoryPhase) < 3
  end,
  card_filter = function(self, player, to_select, selected)
    return #selected == 0
  end,
  on_use = function(self, room, effect)
    local player = effect.from
    local name = Fk:getCardById(effect.cards[1]).trueName
    room:recastCard(effect.cards, player, zhengbing.name)
    if player.dead then return end
    if name == "slash" then
      room:addPlayerMark(player, MarkEnum.AddMaxCardsInTurn, 2)
    elseif name == "jink" then
      player:drawCards(1, zhengbing.name)
    elseif name == "peach" then
      room:changeKingdom(player, "wei", true)
    end
  end,
})

return zhengbing
