local mouGanglie = fk.CreateSkill({
  name = "mou__ganglie",
})

Fk:loadTranslationTable{
  ["mou__ganglie"] = "刚烈",
  [":mou__ganglie"] = "每名角色限一次，出牌阶段限一次，你可以对至少一名对你造成过伤害的角色造成2点伤害。",
  ["#mou__ganglie"] = "刚烈：你可选择至少一名可选角色，各对其造成2点伤害",

  ["$mou__ganglie1"] = "一军之帅，岂惧暗箭之伤。",
  ["$mou__ganglie2"] = "宁陨沙场，不容折侮。",
}

mouGanglie:addEffect("active", {
  anim_type = "offensive",
  prompt = "#mou__ganglie",
  card_num = 0,
  min_target_num = 1,
  can_use = function(self, player)
    return player:usedSkillTimes(mouGanglie.name, Player.HistoryPhase) == 0
  end,
  card_filter = Util.FalseFunc,
  target_filter = function(self, player, to_select, selected)
    return
      table.contains(player:getTableMark("mou__ganglie_enemy"), to_select.id) and
      not table.contains(player:getTableMark("mou__ganglie_targeted"), to_select.id)
  end,
  on_use = function(self, room, effect)
    local player = effect.from
    local record = player:getTableMark("mou__ganglie_targeted")
    table.insertTableIfNeed(record, table.map(effect.tos, Util.IdMapper))
    room:setPlayerMark(player, "mou__ganglie_targeted", record)

    for _, to in ipairs(effect.tos) do
      if to:isAlive() then
        room:damage{
          from = player,
          to = to,
          damage = 2,
          skillName = mouGanglie.name,
        }
      end
    end
  end,
})

mouGanglie:addEffect(fk.BeforeHpChanged, {
  can_refresh = function (self, event, target, player, data)
    return
      target == player and
      player:hasSkill(mouGanglie.name, true) and
      data.reason == "damage" and
      data.damageEvent and
      data.damageEvent.from
  end,
  on_refresh = function (self, event, target, player, data)
    player.room:addTableMarkIfNeed(player, "mou__ganglie_enemy", data.damageEvent.from.id)
  end,
})

mouGanglie:addAcquireEffect(function (self, player)
  local room = player.room
  local enemies = {}
  room.logic:getActualDamageEvents(
    999,
    function(e)
      local damageData = e.data
      if damageData.from and damageData.to == player then
        table.insertIfNeed(enemies, damageData.from.id)
      end

      return false
    end,
    Player.HistoryGame
  )

  room:setPlayerMark(player, "mou__ganglie_enemy", enemies)
end)

return mouGanglie
