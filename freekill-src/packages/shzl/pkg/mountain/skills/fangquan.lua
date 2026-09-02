local fangquan = fk.CreateSkill {
  name = "fangquan",
}

Fk:loadTranslationTable{
  ["fangquan"] = "放权",
  [":fangquan"] = "你可以跳过你的出牌阶段，然后此回合结束时，你可以弃置一张手牌并选择一名其他角色，然后其获得一个额外回合。",

  ["#fangquan-choose"] = "放权：弃置一张手牌，令一名其他角色获得一个额外回合",

  ["$fangquan1"] = "唉，这可如何是好啊！",
  ["$fangquan2"] = "哎，你办事儿，我放心~",
}

fangquan:addEffect(fk.EventPhaseChanging, {
  anim_type = "support",
  audio_index = 1,
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(fangquan.name) and data.phase == Player.Play and not data.skipped
  end,
  on_use = function (self, event, target, player, data)
    data.skipped = true
  end,
})

fangquan:addEffect(fk.TurnEnd, {
  anim_type = "support",
  audio_index = 2,
  can_trigger = function(self, event, target, player, data)
    return target == player and player:usedSkillTimes(fangquan.name, Player.HistoryTurn) > 0 and
      not player.dead and not player:isKongcheng() and
      #player.room:getOtherPlayers(player, false) > 0
  end,
  on_cost = function (self, event, target, player, data)
    local room = player.room
    local tos, cards = room:askToChooseCardsAndPlayers(player, {
      min_card_num = 1,
      max_card_num = 1,
      min_num = 1,
      max_num = 1,
      targets = room:getOtherPlayers(player, false),
      pattern = ".|.|.|hand",
      skill_name = fangquan.name,
      prompt = "#fangquan-choose",
      cancelable = true,
      will_throw = true,
    })
    if #tos > 0 and #cards > 0 then
      event:setCostData(self, {tos = tos, cards = cards})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    room:throwCard(event:getCostData(self).cards, fangquan.name, player, player)
    local to = event:getCostData(self).tos[1]
    if not to.dead then
      to:gainAnExtraTurn(true, fangquan.name)
    end
  end,
})

return fangquan
