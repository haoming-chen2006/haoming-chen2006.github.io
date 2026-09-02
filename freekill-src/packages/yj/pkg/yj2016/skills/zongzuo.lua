
local zongzuo = fk.CreateSkill {
  name = "zongzuo",
  tags = { Skill.Compulsory },
}

Fk:loadTranslationTable{
  ["zongzuo"] = "宗祚",
  [":zongzuo"] = "锁定技，游戏开始时，你加X点体力上限，回复X点体力（X为全场势力数）；当每个势力的最后一名角色死亡后，你减1点体力上限。",

  ["$zongzuo1"] = "尽死生之力，保大厦不倾。",
  ["$zongzuo2"] = "乾坤倒，黎民苦，高祖后，岂任之？",
}

zongzuo:addEffect(fk.GameStart, {
  anim_type = "support",
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(zongzuo.name)
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local kingdoms = {}
    for _, p in ipairs(room.alive_players) do
      table.insertIfNeed(kingdoms, p.kingdom)
    end
    room:changeMaxHp(player, #kingdoms)
    if player:isWounded() and not player.dead then
      room:recover{
        who = player,
        num = math.min(#kingdoms, player.maxHp - player.hp),
        recoverBy = player,
        skillName = zongzuo.name,
      }
    end
  end,
})
zongzuo:addEffect(fk.Deathed, {
  anim_type = "negative",
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(zongzuo.name) and
      table.every(player.room.alive_players, function(p)
        return p.kingdom ~= target.kingdom
      end)
  end,
  on_use = function(self, event, target, player, data)
    player.room:changeMaxHp(player, -1)
  end,
})

return zongzuo
