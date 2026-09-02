local heyuan = fk.CreateSkill {
  name = "heyuan",
}

Fk:loadTranslationTable{
  ["heyuan"] = "合援",
  [":heyuan"] = "每名角色限一次，结束阶段开始时，你可以选择一名已受伤的角色并弃置X张牌（X为你上次发动“镇围”时弃置的牌数），" ..
  "令其执行你于上次“镇围”执行的最后一项，且此后你对除其外的角色发动“镇围”时，该角色也可同时选择是否弃置牌" ..
  "（这些牌于计算“镇围”中的X时视为你弃置的牌）。",

  ["#heyuan-noDiscard"] = "合援：你可令一名满足条件角色执行记录效果",
  ["#heyuan-invoke"] = "合援：你可弃置%arg张牌，令一名满足条件角色执行记录效果",
  ["@@heyuan_owners-noclear"] = "合援",

  ["$heyuan1"] = "扼守涿乡要道，休教刘备西遁。",
  ["$heyuan2"] = "昔擒关羽于临沮，今当缚刘备于夷陵。",
}

heyuan:addEffect(fk.EventPhaseStart, {
  can_trigger = function(self, event, target, player, data)
    return
      target == player and
      player.phase == Player.Finish and
      player:hasSkill(heyuan.name) and
      player:getMark("zhenweiz_discard-noclear") ~= 0 and
      table.find(
        player.room.alive_players,
        function(p)
          return p:isWounded() and not table.contains(player:getTableMark("heyuan_record-noclear"), p.id)
        end
      )
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local targets = table.filter(
      room.alive_players,
      function(p)
        return p:isWounded() and not table.contains(player:getTableMark("heyuan_record-noclear"), p.id)
      end
    )
    local discardNum = player:getMark("zhenweiz_discard-noclear")
    if discardNum == -1 then
      discardNum = 0
    end

    local tos, ids = room:askToChooseCardsAndPlayers(
      player,
      {
        min_num = 1,
        max_num = 1,
        targets = targets,
        min_card_num = discardNum,
        max_card_num = discardNum,
        pattern = ".",
        skill_name = heyuan.name,
        prompt = discardNum == 0 and "#heyuan-noDiscard" or "#heyuan-invoke:::" .. discardNum,
        will_throw = true,
      }
    )

    if #tos == 1 and #ids == discardNum then
      event:setCostData(self, { tos = tos, cards = ids })
      room:addTableMarkIfNeed(player, "heyuan_record-noclear", tos[1].id)
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local to = event:getCostData(self).tos[1]
    ---@type integer[]
    local cards = event:getCostData(self).cards

    ---@type string
    local skillName = heyuan.name
    local room = player.room

    if #cards > 0 then
      room:throwCard(cards, skillName, player, player)

      if not to:isAlive() then
        return false
      end
    end

    local lastEffect = player:getMark("@zhenweiz_effect-noclear")
    if type(lastEffect) == "string" then
      if lastEffect == "zhenweiz_effect_dmg" then
        room:damage{
          from = player,
          to = to,
          damage = 1,
          skillName = skillName,
        }
      else
        to:drawCards(3, skillName)
      end
    end

    if not to:isAlive() then
      return false
    end

    room:addTableMarkIfNeed(to, "@@heyuan_owners-noclear", player.id)
  end,
})

return heyuan
