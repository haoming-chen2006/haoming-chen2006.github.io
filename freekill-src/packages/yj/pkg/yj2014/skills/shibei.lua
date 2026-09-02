
local shibei = fk.CreateSkill {
  name = "shibei",
  tags = { Skill.Compulsory },
}

Fk:loadTranslationTable{
  ["shibei"] = "矢北",
  [":shibei"] = "锁定技，当你受到伤害后，若此伤害是你本回合第一次受到伤害，你回复1点体力；否则你失去1点体力。",

  ["$shibei1"] = "矢志于北，尽忠于国！",
  ["$shibei2"] = "命系袁氏，一心向北。",
}

shibei:addEffect(fk.Damaged, {
  mute = true,
  on_use = function(self, event, target, player, data)
    local room = player.room
    player:broadcastSkillInvoke(shibei.name)
    if data.isVirtualDMG then return end -- 虚拟伤害别管了
    local damage_event = room.logic:getActualDamageEvents(1, function(e) return e.data.to == player end)[1]
    if damage_event and damage_event.data == data then
      room:notifySkillInvoked(player, shibei.name, "defensive")
      if player:isWounded() then
        room:recover{
          who = player,
          num = 1,
          skillName = shibei.name,
        }
      end
    else
      room:notifySkillInvoked(player, shibei.name, "negative")
      room:loseHp(player, 1, shibei.name)
    end
  end,
})

return shibei
