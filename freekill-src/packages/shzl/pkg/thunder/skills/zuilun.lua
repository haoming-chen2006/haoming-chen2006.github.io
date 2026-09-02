local zuilun = fk.CreateSkill {
  name = "zuilun",
}

Fk:loadTranslationTable{
  ["zuilun"] = "罪论",
  [":zuilun"] = "结束阶段，你可以观看牌堆顶三张牌，你每满足以下一项便获得其中的一张，然后以任意顺序放回其余的牌：1.你于此回合内造成过伤害；"..
  "2.你于此回合内未弃置过牌；3.手牌数为全场最少。若均不满足，你与一名其他角色失去1点体力。",

  ["#zuilun-invoke"] = "罪论：你可以观看牌堆顶3张牌，保留%arg张，放回其余的牌",
  ["#zuilun-choose"] = "罪论：选择一名其他角色，你与其各失去1点体力",

  ["$zuilun1"] = "吾有三罪，未能除黄皓、制伯约、守国土。",
  ["$zuilun2"] = "唉，数罪当论，吾愧对先帝恩惠。",
}

zuilun:addEffect(fk.EventPhaseStart, {
  anim_type = "drawcard",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(zuilun.name) and player.phase == Player.Finish
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local n = 0
    if #room.logic:getActualDamageEvents(1, function (e)
      return e.data.from == player
    end, Player.HistoryTurn) > 0 then
      n = n + 1
    end
    local events = room.logic:getEventsOfScope(GameEvent.MoveCards, 1, function(e)
      for _, move in ipairs(e.data) do
        if move.from == player and move.moveReason == fk.ReasonDiscard and
          table.find(move.moveInfo, function (info)
            return info.fromArea == Card.PlayerHand or info.fromArea == Card.PlayerEquip
          end) then
          return true
        end
      end
    end, Player.HistoryTurn)
    if #events == 0 then
      n = n + 1
    end
    if table.every(room.alive_players, function(p)
      return p:getHandcardNum() >= player:getHandcardNum()
    end) then
      n = n + 1
    end
    if room:askToSkillInvoke(player, {
      skill_name = zuilun.name,
      prompt = "#zuilun-invoke:::"..n,
    }) then
      event:setCostData(self, n)
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local n = event:getCostData(self)
    local cards = room:getNCards(3)
    local result = room:askToGuanxing(player, {
      cards = cards,
      area_names = {"Top", "toObtain"},
      top_limit = {3 - n, 3},
      bottom_limit = {n, n},
      skill_name = zuilun.name,
      skip = true,
    })
    if #result.top > 0 then
      for i = #result.top, 1, -1 do
        table.removeOne(room.draw_pile, result.top[i])
        table.insert(room.draw_pile, 1, result.top[i])
      end
      room:syncDrawPile()
    end
    if #result.bottom > 0 then
      room:moveCardTo(result.bottom, Player.Hand, player, fk.ReasonJustMove, zuilun.name, nil, false, player)
    else
      local targets = room:getOtherPlayers(player, false)
      local to = room:askToChoosePlayers(player, {
        min_num = 1,
        max_num = 1,
        targets = targets,
        skill_name = zuilun.name,
        prompt = "#zuilun-choose",
        cancelable = false,
      })[1]
      room:loseHp(player, 1, zuilun.name)
      if not to.dead then
        room:loseHp(to, 1, zuilun.name)
      end
    end
  end,
})

return zuilun
