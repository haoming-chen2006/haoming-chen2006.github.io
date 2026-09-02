local jiebing = fk.CreateSkill {
  name = "jiebingx",
  tags = { Skill.Wake },
}

Fk:loadTranslationTable{
  ["jiebingx"] = "劫柄",
  [":jiebingx"] = "觉醒技，准备阶段，若你区域内的<a href='premeditate_href'>“蓄谋”</a>牌大于主公的体力值，你加2点体力上限并回复2点体力，"..
  "然后获得〖暴威〗。",
}

jiebing:addEffect(fk.EventPhaseStart, {
  can_trigger = function (self, event, target, player, data)
    return target == player and player:hasSkill(jiebing.name) and player.phase == Player.Start and
      player:usedSkillTimes(jiebing.name, Player.HistoryGame) == 0
  end,
  can_wake = function(self, event, target, player, data)
    if player.room:getLord() then
      local n = #table.filter(player:getCardIds("j"), function (id)
        return player:getVirtualEquip(id) and player:getVirtualEquip(id).name == "premeditate"
      end)
      for _, p in ipairs(player.room.players) do
        if p.role == "lord" and n > p.hp then
          return true
        end
      end
    end
  end,
  on_use = function (self, event, target, player, data)
    local room = player.room
    room:changeMaxHp(player, 2)
    if player.dead then return end
    if player:isWounded() then
      room:recover{
        who = player,
        num = 2,
        recoverBy = player,
        skillName = jiebing.name,
      }
      if player.dead then return end
    end
    room:handleAddLoseSkills(player, "baowei")
  end,
})

return jiebing
