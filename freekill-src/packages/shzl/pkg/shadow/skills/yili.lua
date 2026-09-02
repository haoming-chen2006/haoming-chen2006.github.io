local yili = fk.CreateSkill {
  name = "yili",
}

Fk:loadTranslationTable{
  ["yili"] = "遗礼",
  [":yili"] = "出牌阶段开始时，你可以失去1点体力或移除1枚“橘”，然后令一名其他角色获得1枚“橘”。",

  ["#yili-choose"] = "遗礼: 你可以失去1点体力或者移除1枚“橘”，令一名其他角色获得1枚“橘”",
  ["yili_lose_orange"] = "移除1枚“橘”",

  ["$yili2"] = "行遗礼之举，于不敬王者。",
  ["$yili1"] = "遗失礼仪，则俱非议。",
}

yili:addEffect(fk.EventPhaseStart, {
  anim_type = "support",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(yili.name) and player.phase == Player.Play and
      #player.room:getOtherPlayers(player, false) > 0
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local to = room:askToChoosePlayers(player, {
      min_num = 1,
      max_num = 1,
      targets = room:getOtherPlayers(player, false),
      skill_name = yili.name,
      prompt = "#yili-choose",
      cancelable = true,
    })
    if #to > 0 then
      local choice = (player:getMark("@orange") == 0) and "loseHp" or
        room:askToChoice(player, {
          choices = {"loseHp", "yili_lose_orange"},
          skill_name = yili.name,
        })
      event:setCostData(self, {tos = to, choice = choice})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local to = event:getCostData(self).tos[1]
    if event:getCostData(self).choice == "loseHp" then
      room:loseHp(player, 1, yili.name)
    else
      room:removePlayerMark(player, "@orange")
    end
    if player:hasSkill("huaiju", true) and not to.dead then
      room:addPlayerMark(to, "@orange")
    end
  end,
})

return yili
