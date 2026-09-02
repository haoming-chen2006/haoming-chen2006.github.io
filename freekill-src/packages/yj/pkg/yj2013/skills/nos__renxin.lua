local renxin = fk.CreateSkill {
  name = "nos__renxin",
}

Fk:loadTranslationTable{
  ["nos__renxin"] = "仁心",
  [":nos__renxin"] = "当一名其他角色处于濒死状态时，你可以将武将牌翻面并将所有手牌（至少一张）交给该角色。若如此做，该角色回复1点体力。",

  ["#nos__renxin-invoke"] = "仁心：你可以翻面并将所有手牌交给 %dest，令其回复1点体力",

  ["$nos__renxin1"] = "冲愿以此仁心，消弭杀机，保将军周全。",
  ["$nos__renxin2"] = "阁下罪不至死，冲愿施以援手相救。",
}

renxin:addEffect(fk.AskForPeaches, {
  anim_type = "support",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(renxin.name) and
      not player:isKongcheng() and data.who ~= player
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    if room:askToSkillInvoke(player, {
      skill_name = renxin.name,
      prompt = "#nos__renxin-invoke::"..data.who.id,
    }) then
      event:setCostData(self, {tos = {data.who}})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    player:turnOver()
    if player:isKongcheng() or player.dead or data.who.dead then return end
    room:obtainCard(data.who, player:getCardIds("h"), false, fk.ReasonGive, player, renxin.name)
    if not data.who.dead and data.who:isWounded() then
      room:recover{
        who = data.who,
        num = 1,
        recoverBy = player,
        skillName = renxin.name,
      }
    end
  end,
})

return renxin
