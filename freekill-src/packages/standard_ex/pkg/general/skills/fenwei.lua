Fk:loadTranslationTable{
  ["fenwei"] = "奋威",
  [":fenwei"] = "限定技，当一张锦囊牌指定多个目标后，你可令此牌对其中任意个目标无效。",

  ["#fenwei-choose"] = "奋威：你可以令此%arg对任意个目标无效",

  ["$fenwei1"] = "奋勇当先，威名远扬！",
  ["$fenwei2"] = "哼！敢欺我东吴无人。",
}

local fenwei = fk.CreateSkill{
  name = "fenwei",
  tags = { Skill.Limited },
}

fenwei:addEffect(fk.TargetSpecified, {
  anim_type = "defensive",
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(fenwei.name) and
      data.card.type == Card.TypeTrick and data.firstTarget and #data.use.tos > 1 and
      player:usedSkillTimes(fenwei.name, Player.HistoryGame) == 0
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local tos = room:askToChoosePlayers(player, {
      targets = data.use.tos,
      min_num = 1,
      max_num = #data.tos,
      prompt = "#fenwei-choose:::"..data.card:toLogString(),
      skill_name = fenwei.name,
      cancelable = true,
    })
    if #tos > 0 then
      room:sortByAction(tos)
      event:setCostData(self, {tos = tos})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    data.use.nullifiedTargets = data.use.nullifiedTargets or {}
    table.insertTableIfNeed(data.use.nullifiedTargets, event:getCostData(self).tos)
  end,
})

return fenwei
