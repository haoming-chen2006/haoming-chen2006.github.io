local huituo = fk.CreateSkill {
  name = "huituo",
}

Fk:loadTranslationTable{
  ["huituo"] = "恢拓",
  [":huituo"] = "当你受到伤害后，你可以令一名角色进行判定，若结果为：红色，其回复1点体力；黑色，其摸X张牌（X为伤害值）。",

  ["#huituo-choose"] = "恢拓：你可以令一名角色判定，红色其回复1点体力，黑色其摸牌",

  ["$huituo1"] = "大展宏图，就在今日！",
  ["$huituo2"] = "富我大魏，扬我国威！",
}

huituo:addEffect(fk.Damaged, {
  anim_type = "masochism",
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local to = room:askToChoosePlayers(player, {
      skill_name = huituo.name,
      min_num = 1,
      max_num = 1,
      targets = room.alive_players,
      prompt = "#huituo-choose",
      cancelable = true,
    })
    if #to > 0 then
    event:setCostData(self, {tos = to})
    return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local to = event:getCostData(self).tos[1]
    local judge = {
      who = to,
      reason = huituo.name,
      pattern = ".",
    }
    room:judge(judge)
    if to.dead then return end
    if judge.card.color == Card.Red then
      if to:isWounded() then
        room:recover{
        who = to,
        num = 1,
        recoverBy = player,
        skillName = huituo.name,
        }
      end
    elseif judge.card.color == Card.Black then
      to:drawCards(data.damage, huituo.name)
    end
  end,
})

return huituo
