local jiexun = fk.CreateSkill {
  name = "jiexun",
}

Fk:loadTranslationTable{
  ["jiexun"] = "诫训",
  [":jiexun"] = "结束阶段，你可以令一名其他角色摸等同于场上<font color='red'>♦</font>牌数的牌，然后弃置X张牌（X为本技能发动过的次数），"..
  "若其因此法弃置了所有牌，你失去〖诫训〗并修改〖复难〗（删去“令其获得你使用的牌”）。",

  ["#jiexun-choose"] = "诫训：令一名角色摸%arg张牌，然后弃%arg2张牌",
  ["@jiexun"] = "诫训",

  ["$jiexun1"] = "帝王应以社稷为重，以大观为主。",
  ["$jiexun2"] = "吾冒昧进谏，只求陛下思虑。",
}

jiexun:addEffect(fk.EventPhaseStart, {
  anim_type = "control",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(jiexun.name) and player.phase == Player.Finish and
      #player.room:getOtherPlayers(player, false) > 0
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local n = 0
    for _, p in ipairs(room.alive_players) do
      n = n + #table.filter(p:getCardIds("ej"), function(id)
        return Fk:getCardById(id).suit == Card.Diamond
      end)
    end
    local m = player:getMark("@jiexun") + 1
    local to = room:askToChoosePlayers(player, {
      skill_name = jiexun.name,
      min_num = 1,
      max_num = 1,
      targets = room:getOtherPlayers(player, false),
      prompt = "#jiexun-choose:::"..n..":"..m,
    })
    if #to > 0 then
      event:setCostData(self, { tos = to, choices = {n, m} })
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    room:addPlayerMark(player, "@jiexun")
    local to = event:getCostData(self).tos[1]
    local n = event:getCostData(self).choices[1]
    local m = event:getCostData(self).choices[2]
    if n > 0 then
      to:drawCards(n, jiexun.name)
    end
    if to:isNude() or to.dead then return end
    local throw = room:askToDiscard(to, {
      min_num = m,
      max_num = m,
      include_equip = true,
      skill_name = jiexun.name,
      cancelable = false,
      skip = true,
    })
    local change = (#throw == #to:getCardIds("he"))
    room:throwCard(throw, jiexun.name, to, to)
    if change and not player.dead then
      if player:hasSkill("funan", true) then
        room:setPlayerMark(player, "funan_update", 1)
      end
      room:handleAddLoseSkills(player, "-jiexun")
    end
  end,
})

jiexun:addLoseEffect(function (self, player)
  player.room:setPlayerMark(player, "@jiexun", 0)
end)

return jiexun
