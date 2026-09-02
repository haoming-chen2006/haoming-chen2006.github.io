local benghuai = fk.CreateSkill {
  name = "benghuai",
  tags = { Skill.Compulsory },
}

Fk:loadTranslationTable{
  ["benghuai"] = "崩坏",
  [":benghuai"] = "锁定技，结束阶段，若你不是体力值最小的角色，你选择：1.减1点体力上限；2.失去1点体力。",

  ["$benghuai1"] = "我是不是该减肥了？",
  ["$benghuai2"] = "呃……",
}

benghuai:addEffect(fk.EventPhaseStart, {
  anim_type = "negative",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(benghuai.name) and player.phase == Player.Finish and
      table.find(player.room.alive_players, function(p)
        return p.hp < player.hp
      end)
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local choice = room:askToChoice(player, {
      choices = { "loseMaxHp", "loseHp" },
      skill_name = benghuai.name,
    })
    if choice == "loseMaxHp" then
      room:changeMaxHp(player, -1)
    else
      room:loseHp(player, 1, benghuai.name)
    end
  end,
})

return benghuai
