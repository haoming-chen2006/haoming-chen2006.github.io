local jujian = fk.CreateSkill {
  name = "jujian",
}

Fk:loadTranslationTable{
  ["jujian"] = "举荐",
  [":jujian"] = "结束阶段，你可以弃置一张非基本牌，令一名其他角色选择一项：摸两张牌；回复1点体力；复原武将牌。",

  ["#jujian-choose"] = "举荐：你可以弃置一张非基本牌，令一名其他角色摸牌/回复体力/复原武将牌",

  ["$jujian1"] = "天下大任，望君莫辞！",
  ["$jujian2"] = "卧龙之才，远胜于我。",
}

jujian:addEffect(fk.EventPhaseStart, {
  anim_type = "support",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(jujian.name) and player.phase == Player.Finish and
      not player:isNude() and #player.room:getOtherPlayers(player, false) > 0
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local tos, card = room:askToChooseCardsAndPlayers(player, {
      skill_name = jujian.name,
      min_num = 1,
      max_num = 1,
      min_card_num = 1,
      max_card_num = 1,
      targets = player.room:getOtherPlayers(player, false),
      pattern = ".|.|.|.|.|^basic",
      prompt = "#jujian-choose",
      cancelable = true,
      skip = true,
      will_throw = true,
    })
    if #tos > 0 then
      event:setCostData(self, {tos = tos, cards = card})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local to = event:getCostData(self).tos[1]
    room:throwCard(event:getCostData(self).cards, jujian.name, player, player)
    if to.dead then return end
    local choices = {"draw2"}
    if to:isWounded() then
      table.insert(choices, "recover")
    end
    if not to.faceup or to.chained then
      table.insert(choices, "reset")
    end
    local choice = room:askToChoice(to, {
      choices = choices,
      skill_name = jujian.name,
      all_choices = {"draw2", "recover", "reset"}
    })
    if choice == "draw2" then
      to:drawCards(2, jujian.name)
    elseif choice == "recover" then
      room:recover{
        who = to,
        num = 1,
        recoverBy = player,
        skillName = jujian.name,
      }
    else
      to:reset()
    end
  end,
})

return jujian