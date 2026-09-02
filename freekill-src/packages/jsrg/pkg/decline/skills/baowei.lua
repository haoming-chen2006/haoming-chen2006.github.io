local baowei = fk.CreateSkill {
  name = "baowei",
  tags = { Skill.Compulsory },
}

Fk:loadTranslationTable{
  ["baowei"] = "暴威",
  [":baowei"] = "锁定技，结束阶段，你对一名本回合使用或打出过牌的其他角色造成2点伤害，若满足条件的角色大于两名，则改为你失去2点体力。",

  ["#baowei-choose"] = "暴威：对一名角色造成2点伤害！",
}

baowei:addEffect(fk.EventPhaseStart, {
  mute = true,
  can_trigger = function (self, event, target, player, data)
    if target == player and player:hasSkill(baowei.name) and player.phase == Player.Finish then
      local targets = {}
      player.room.logic:getEventsOfScope(GameEvent.UseCard, 1, function (e)
        local p = e.data.from
        if p ~= player and not p.dead then
          table.insertIfNeed(targets, p)
        end
      end, Player.HistoryTurn)
      player.room.logic:getEventsOfScope(GameEvent.RespondCard, 1, function (e)
        local p = e.data.from
        if p ~= player and not p.dead then
          table.insertIfNeed(targets, p)
        end
      end, Player.HistoryTurn)
      if #targets > 0 then
        if #targets > 2 then
          event:setCostData(self, {choice = "negative"})
        else
          event:setCostData(self, {choice = "offensive", extra_data = targets})
        end
        return true
      end
    end
  end,
  on_use = function (self, event, target, player, data)
    local room = player.room
    local choice = event:getCostData(self).choice
    player:broadcastSkillInvoke(baowei.name)
    if choice == "offensive" then
      local to = room:askToChoosePlayers(player, {
        min_num = 1,
        max_num = 1,
        targets = event:getCostData(self).extra_data,
        skill_name = baowei.name,
        prompt = "#baowei-choose",
        cancelable = false,
      })[1]
      room:notifySkillInvoked(player, baowei.name, "offensive", {to})
      room:damage{
        from = player,
        to = to,
        damage = 2,
        skillName = baowei.name,
      }
    else
      room:notifySkillInvoked(player, baowei.name, "negative")
      room:loseHp(player, 2, baowei.name)
    end
  end,
})

return baowei
