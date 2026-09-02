local fangjie = fk.CreateSkill {
  name = "fangjie",
}

Fk:loadTranslationTable{
  ["fangjie"] = "芳洁",
  [":fangjie"] = "准备阶段，若你没有“蓄谋”牌，你回复1点体力并摸一张牌，否则你可以弃置任意张你区域里的“蓄谋”牌并失去此技能。",

  ["#fangjie-ask"] = "芳洁：是否弃置任意张“蓄谋”牌并失去“芳洁”？",
}

fangjie:addEffect(fk.EventPhaseStart, {
  anim_type = "support",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(fangjie.name) and player.phase == Player.Start
  end,
  on_cost = function (self, event, target, player, data)
    local room = player.room
    local cards = table.filter(player:getCardIds("j"), function (id)
      return player:getVirtualEquip(id) and player:getVirtualEquip(id).name == "premeditate"
    end)
    if #cards == 0 then
      event:setCostData(self, {choice = "recover"})
      return true
    else
      cards = room:askToCards(player, {
        min_num = 1,
        max_num = #cards,
        include_equip = false,
        skill_name = fangjie.name,
        pattern = tostring(Exppattern{ id = cards }),
        prompt = "#fangjie-ask",
        cancelable = true,
        expand_pile = cards,
      })
      if #cards > 0 then
        event:setCostData(self, {choice = "discard", cards = cards})
        return true
      end
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local choice = event:getCostData(self).choice
    if choice == "recover" then
      if player:isWounded() then
        room:recover{
          who = player,
          num = 1,
          recoverBy = player,
          skillName = fangjie.name,
        }
        if player.dead then return end
      end
      player:drawCards(1, fangjie.name)
    else
      room:throwCard(event:getCostData(self).cards, fangjie.name, player, player)
      room:handleAddLoseSkills(player, "-fangjie")
    end
  end,
})

return fangjie
