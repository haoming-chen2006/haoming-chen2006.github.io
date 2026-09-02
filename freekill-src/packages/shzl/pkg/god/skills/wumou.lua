local wumou = fk.CreateSkill {
  name = "wumou",
  tags = {Skill.Compulsory},
}

Fk:loadTranslationTable{
  ["wumou"] = "无谋",
  [":wumou"] = "锁定技，当你使用普通锦囊牌时，你选择：1.弃1枚“暴怒”；2.失去1点体力。",

  ["lose_baonu"] = "弃1枚“暴怒”",

  ["$wumou1"] = "哪个说我有勇无谋？!",
  ["$wumou2"] = "不管这些了！",
}

wumou:addEffect(fk.CardUsing, {
  anim_type = "negative",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(wumou.name) and data.card:isCommonTrick()
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local choices = {"loseHp"}
    if player:getMark("@baonu") > 0 then
      table.insert(choices, "lose_baonu")
    end
    if room:askToChoice(player, {
      choices = choices,
      skill_name = wumou.name,
    }) == "loseHp" then
      room:loseHp(player, 1, wumou.name)
    else
      room:removePlayerMark(player, "@baonu", 1)
    end
  end,
})

return wumou
