local poshi = fk.CreateSkill {
  name = "poshi",
  tags = {Skill.Wake},
  related_skills = { "huairou" },
}

Fk:loadTranslationTable{
  ["poshi"] = "破势",
  [":poshi"] = "觉醒技，准备阶段，若你所有装备栏均被废除或体力值为1，则你减1点体力上限，然后将手牌摸至体力上限，失去〖决堰〗，获得〖怀柔〗。",

  ["$poshi1"] = "破羊祜之策，势在必行！",
  ["$poshi2"] = "破晋军分进合击之势，牵晋军主力之实！",
}

poshi:addEffect(fk.EventPhaseStart, {
  anim_type = "drawcard",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(poshi.name) and player.phase == Player.Start and
      player:usedSkillTimes(poshi.name, Player.HistoryGame) == 0
  end,
  can_wake = function(self, event, target, player, data)
    return #player:getAvailableEquipSlots() == 0 or player.hp == 1
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    room:changeMaxHp(player, -1)
    if player.dead then return end
    local x = player.maxHp - player:getHandcardNum()
    if x > 0 then
      player:drawCards(x, poshi.name)
    end
    room:handleAddLoseSkills(player, "-jueyan|huairou")
  end,
})

return poshi
