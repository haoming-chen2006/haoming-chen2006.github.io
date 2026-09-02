
local gongao = fk.CreateSkill {
  name = "gongao",
  tags = { Skill.Compulsory },
}

Fk:loadTranslationTable{
  ["gongao"] = "功獒",
  [":gongao"] = "锁定技，当一名角色死亡后，你增加1点体力上限，回复1点体力。",

  ["$gongao1"] = "攻城拔寨，建功立业。",
  ["$gongao2"] = "恪尽职守，忠心事主。",
}

gongao:addEffect(fk.Deathed, {
  anim_type = "support",
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(gongao.name)
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    room:changeMaxHp(player, 1)
    if not player.dead and player:isWounded() then
      room:recover{
        who = player,
        num = 1,
        recoverBy = player,
        skillName = gongao.name,
      }
    end
  end,
})

return gongao
