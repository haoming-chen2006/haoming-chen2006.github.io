local fusha = fk.CreateSkill {
  name = "fusha",
  tags = { Skill.Limited },
}

Fk:loadTranslationTable{
  ["fusha"] = "伏杀",
  [":fusha"] = "限定技，出牌阶段，若你的攻击范围内仅有一名角色，你可以对其造成X点伤害（X为你的攻击范围且至多为游戏人数）。",

  ["#fusha"] = "伏杀：对一名角色造成%arg点伤害！",
}

fusha:addEffect("active", {
  anim_type = "offensive",
  prompt = function(self, player)
    return "#fusha:::" .. math.min(player:getAttackRange(), #Fk:currentRoom().players)
  end,
  card_num = 0,
  target_num = 1,
  card_filter = Util.FalseFunc,
  can_use = function(self, player)
    return player:usedSkillTimes(fusha.name, Player.HistoryGame) == 0 and
      #table.filter(Fk:currentRoom().alive_players, function(p)
        return player:inMyAttackRange(p)
      end) == 1
  end,
  target_filter = function(self, player, to_select, selected)
    return #selected == 0 and player:inMyAttackRange(to_select)
  end,
  on_use = function(self, room, effect)
    local player = effect.from
    local target = effect.tos[1]
    room:damage{
      from = player,
      to = target,
      damage = math.min(player:getAttackRange(), #room.players),
      skill_name = fusha.name,
    }
  end
})

return fusha
