local jinqu = fk.CreateSkill {
  name = "jinqu",
}

Fk:loadTranslationTable{
  ["jinqu"] = "进趋",
  [":jinqu"] = "结束阶段，你可以摸两张牌，然后将手牌弃至X张（X为你本回合发动〖奇制〗的次数）。",

  ["#jinqu-invoke"] = "进趋：是否摸两张牌，然后将手牌弃至%arg？",

  ["$jinqu1"] = "建上昶水城，以逼夏口！",
  ["$jinqu2"] = "通川聚粮，伐吴之业，当步步为营。",
}

jinqu:addEffect(fk.EventPhaseStart, {
  anim_type = "drawcard",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(jinqu.name) and player.phase == Player.Finish
  end,
  on_cost = function (self, event, target, player, data)
    return player.room:askToSkillInvoke(player, {
      skill_name = jinqu.name,
      prompt = "#jinqu-invoke:::"..player:usedSkillTimes("qizhi", Player.HistoryTurn)
    })
  end,
  on_use = function(self, event, target, player, data)
    player:drawCards(2, jinqu.name)
    if player.dead then return end
    local n = player:getHandcardNum() - player:usedSkillTimes("qizhi", Player.HistoryTurn)
    if n > 0 then
      player.room:askToDiscard(player, {
        min_num = n,
        max_num = n,
        include_equip = false,
        skill_name = jinqu.name,
        cancelable = false,
      })
    end
  end,
})

return jinqu
