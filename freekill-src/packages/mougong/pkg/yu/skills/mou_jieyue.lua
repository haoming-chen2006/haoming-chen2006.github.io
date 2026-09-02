local mouJieyue = fk.CreateSkill({
  name = "mou__jieyue",
})

Fk:loadTranslationTable{
  ["mou__jieyue"] = "节钺",
  [":mou__jieyue"] = "结束阶段，你可以令一名其他角色获得1点护甲，然后其可以交给你一张牌。",
  ["#mou__jieyue-choose"] = "节钺：你可以令一名其他角色获得1点护甲",
  ["#mou__jieyue-give"] = "节钺：你可以交给 %src 一张牌",

  ["$mou__jieyue1"] = "尔等小儿，徒费兵力！",
  ["$mou__jieyue2"] = "雕虫小技，静待则已。",
}

mouJieyue:addEffect(fk.EventPhaseStart, {
  anim_type = "support",
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(mouJieyue.name) and player == target and player.phase == Player.Finish
  end,
  on_cost = function (self, event, target, player, data)
    local tos = player.room:askToChoosePlayers(
      player,
      {
        targets = player.room:getOtherPlayers(player, false),
        min_num = 1,
        max_num = 1,
        prompt = "#mou__jieyue-choose",
        skill_name = mouJieyue.name,
      }
    )
    if #tos > 0 then
      event:setCostData(self, tos[1])
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local to = event:getCostData(self)
    room:changeShield(to, 1)
    if not to:isNude() and not player.dead then
      local card = room:askToCards(
        to,
        {
          min_num = 1,
          max_num = 1,
          include_equip = true,
          skill_name = mouJieyue.name,
          pattern = ".",
          prompt = "#mou__jieyue-give:" .. player.id
        }
      )
      if #card > 0 then
        room:obtainCard(player, card[1], false, fk.ReasonGive)
      end
    end
  end,
})

return mouJieyue
