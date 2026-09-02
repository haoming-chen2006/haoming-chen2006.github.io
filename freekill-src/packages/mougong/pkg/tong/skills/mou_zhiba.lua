local mouZhiba = fk.CreateSkill({
  name = "mou__zhiba",
  tags = { Skill.Lord, Skill.Limited },
})

Fk:loadTranslationTable{
  ["mou__zhiba"] = "制霸",
  [":mou__zhiba"] = "主公技，限定技，当你进入濒死状态时，你可以回复X点体力（X为吴势力角色数-1）"..
  "并修改〖激昂〗（将“出牌阶段限一次”改为“出牌阶段限X次（X为吴势力角色数）”），"..
  "然后其他吴势力角色依次受到1点无伤害来源的伤害，若其死亡，你摸三张牌。",

  ["$mou__zhiba1"] = "知君英豪，望来归效！",
  ["$mou__zhiba2"] = "孰胜孰负，犹未可知！",
}

mouZhiba:addEffect(fk.EnterDying, {
  anim_type = "defensive",
  can_trigger = function(self, event, target, player, data)
    return
      target == player and
      player:hasSkill(mouZhiba.name) and
      player:usedSkillTimes(mouZhiba.name, Player.HistoryGame) == 0 and
      #table.filter(player.room.alive_players, function(p) return p.kingdom == "wu" end) > 1
  end,
  on_use = function(self, event, target, player, data)
    ---@type string
    local skillName = mouZhiba.name
    local room = player.room
    local targets = {}
    for _, p in ipairs(room:getAlivePlayers()) do
      if p.kingdom == "wu" then
        table.insert(targets, p)
      end
    end
    if #targets < 2 then return false end
    room:recover{
      who = player,
      num = #targets - 1,
      recoverBy = player,
      skillName = skillName
    }

    table.removeOne(targets, player)
    for _, p in ipairs(targets) do
      if not p.dead then
        room:damage{
          from = nil,
          to = p,
          damage = 1,
          skillName = skillName
        }
        if p.dead and not player.dead then
          player:drawCards(3, skillName)
        end
      end
    end
  end,
})

return mouZhiba
