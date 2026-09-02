local youdi = fk.CreateSkill {
  name = "youdi",
}

Fk:loadTranslationTable{
  ["youdi"] = "诱敌",
  [":youdi"] = "结束阶段，你可以令一名其他角色弃置你的一张牌，若此牌不为【杀】，你获得其一张牌。",

  ["#youdi-choose"] = "诱敌：令一名角色弃置你的一张牌，若不为【杀】，你获得其一张牌",

  ["$youdi1"] = "无名小卒，可敢再前进一步！",
  ["$youdi2"] = "予以小利，必有大获。",
}

youdi:addEffect(fk.EventPhaseStart, {
  anim_type = "control",
  audio_index = 1,
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(youdi.name) and player.phase == Player.Finish and
      not player:isNude() and #player.room:getOtherPlayers(player, false) > 0
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local to = room:askToChoosePlayers(player, {
      skill_name = youdi.name,
      min_num = 1,
      max_num = 1,
      targets = player.room:getOtherPlayers(player, false),
      prompt = "#youdi-choose",
      cancelable = true,
    })
    if #to > 0 then
      event:setCostData(self, {tos = to})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local to = event:getCostData(self).tos[1]
    local card = room:askToChooseCard(to, {
      target = player,
      flag = "he",
      skill_name = youdi.name,
    })
    local yes = Fk:getCardById(card).trueName ~= "slash"
    room:throwCard(card, youdi.name, player, to)
    if player.dead or to.dead then return end
    if yes and not to:isNude() then
      player:broadcastSkillInvoke(youdi.name, 2)
      local card2 = room:askToChooseCard(player, {
        target = to,
        flag = "he",
        skill_name = youdi.name,
      })
      room:obtainCard(player, card2, false, fk.ReasonPrey, player, youdi.name)
    end
  end,
})

return youdi
