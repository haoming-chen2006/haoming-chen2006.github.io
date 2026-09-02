local haoshi = fk.CreateSkill {
  name = "haoshi",
}

Fk:loadTranslationTable{
  ["haoshi"] = "好施",
  [":haoshi"] = "摸牌阶段，你可以多摸两张牌，然后若你的手牌数大于5，你将半数（向下取整）手牌交给手牌牌最少的一名其他角色。",

  ["#haoshi-give"] = "好施：将%arg张手牌交给手牌最少的一名其他角色",

  ["$haoshi1"] = "拿去拿去，莫跟哥哥客气！",
  ["$haoshi2"] = "来来来，见面分一半。",
}

haoshi:addEffect(fk.DrawNCards, {
  anim_type = "drawcard",
  on_use = function(self, event, target, player, data)
    data.n = data.n + 2
  end,
})
haoshi:addEffect(fk.AfterDrawNCards, {
  mute = true,
  is_delay_effect = true,
  can_trigger = function(self, event, target, player, data)
    return not player.dead and player:usedSkillTimes(haoshi.name, Player.HistoryPhase) > 0 and
      player:getHandcardNum() > 5 and #player.room.alive_players > 1
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local x = player:getHandcardNum() // 2
    local targets = {}
    local n = 0
    for _, p in ipairs(room.alive_players) do
      if p ~= player then
        if #targets == 0 then
          table.insert(targets, p)
          n = p:getHandcardNum()
        else
          if p:getHandcardNum() < n then
            targets = {p}
            n = p:getHandcardNum()
          elseif p:getHandcardNum() == n then
            table.insert(targets, p)
          end
        end
      end
    end
    local tos, cards = room:askToChooseCardsAndPlayers(player, {
      min_num = 1,
      max_num = 1,
      max_card_num = x,
      min_card_num = x,
      targets = targets,
      pattern = ".|.|.|hand",
      skill_name = haoshi.name,
      prompt = "#haoshi-give:::"..x,
      cancelable = false,
    })
    room:moveCardTo(cards, Card.PlayerHand, tos[1], fk.ReasonGive, haoshi.name, nil, false, player)
  end,
})

return haoshi
