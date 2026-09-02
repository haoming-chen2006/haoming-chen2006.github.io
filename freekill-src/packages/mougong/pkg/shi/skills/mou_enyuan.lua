local mouEnyuan = fk.CreateSkill({
  name = "mou__enyuan",
  tags = { Skill.Compulsory },
})

Fk:loadTranslationTable{
  ["mou__enyuan"] = "恩怨",
  [":mou__enyuan"] = "锁定技，准备阶段，若有“眩”标记的角色自其获得“眩”标记开始你获得其的牌数：不小于3，你移除其“眩”标记，" ..
  "然后交给其三张牌；小于3，其移除“眩”标记并失去1点体力，然后你回复1点体力。",
  ["#mou__enyuan-give"] = "恩怨：交给 %src 三张牌",

  ["$mou__enyuan1"] = "恩如泰山，当还以东海。",
  ["$mou__enyuan2"] = "汝既负我，哼哼，休怪军法无情！",
}

mouEnyuan:addEffect(fk.EventPhaseStart, {
  mute = true,
  can_trigger = function(self, event, target, player, data)
    return
      player:hasSkill(mouEnyuan.name) and
      target == player and
      player.phase == Player.Start and
      table.find(player.room:getOtherPlayers(player, false), function(p) return p:getMark("@@mou__xuanhuo") > 0 end)
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    room:notifySkillInvoked(player, self.name)
    for _, p in ipairs(room:getOtherPlayers(player)) do
      if p:getMark("@@mou__xuanhuo") > 0 then
        room:setPlayerMark(p, "@@mou__xuanhuo", 0)
        local mark = player:getTableMark("mou__xuanhuo_count")
        local count = mark[tostring(p.id)] or 0
        if count >= 3 then
          player:broadcastSkillInvoke(self.name, 1)
          if not player:isNude() then
            local cards = #player:getCardIds("he") < 3 and player:getCardIds("he") or
            room:askToCards(
              player,
              {
                min_num = 3,
                max_num = 3,
                include_equip = true,
                skill_name = mouEnyuan.name,
                cancelable = false,
                pattern = ".",
                prompt = "#mou__enyuan-give:" .. p.id
              }
            )
            room:obtainCard(p, cards, false, fk.ReasonGive)
          end
        else
          player:broadcastSkillInvoke(self.name, 2)
          room:loseHp(p, 1, self.name)
          if not player.dead and player:isWounded() then
            room:recover { num = 1, skillName = self.name, who = player , recoverBy = player}
          end
        end
      end
    end
    room:setPlayerMark(player, "mou__xuanhuo_count", 0)
  end,
})

return mouEnyuan
