local mouHongyan = fk.CreateSkill({
  name = "mou__hongyan",
  tags = { Skill.Compulsory },
})

Fk:loadTranslationTable{
  ["mou__hongyan"] = "红颜",
  [":mou__hongyan"] = "锁定技，你的♠牌或你的♠判定牌的花色视为<font color='red'>♥</font>。"..
  "当一名角色的判定结果确定前，若花色为<font color='red'>♥</font>，你将判定结果改为任意一种花色。",
  ["#mou__hongyan_trigger"] = "红颜",
  ["#mou__hongyan-choice"] = "红颜：修改 %dest 进行 %arg 判定结果的花色",
  ["#mou__hongyan-retrial"] = "红颜：你可以修改 %dest 进行 %arg 判定结果的花色",
  ["#mou__hongyan_delay"] = "红颜",

  ["$mou__hongyan"] = "（琴声）",
}

mouHongyan:addEffect("filter", {
  card_filter = function(self, to_select, player, isJudgeEvent)
    return
      to_select.suit == Card.Spade and
      player:hasSkill(mouHongyan.name) and
      (table.contains(player:getCardIds("he"), to_select.id) or isJudgeEvent)
  end,
  view_as = function(self, player, to_select)
    return Fk:cloneCard(to_select.name, Card.Heart, to_select.number)
  end,
})

mouHongyan:addEffect(fk.AskForRetrial, {
  anim_type = "control",
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(mouHongyan.name) and data.card.suit == Card.Heart
  end,
  on_use = function(self, event, target, player, data)
    ---@type string
    local skillName = mouHongyan.name
    local room = player.room
    local suits = { "log_spade", "log_club", "log_heart", "log_diamond" }
    local choice = room:askToChoice(
      player,
      {
        choices = suits,
        skill_name = skillName,
        prompt = "#mou__hongyan-choice::" .. target.id .. ":" .. data.reason
      }
    )
    local new_card = Fk:cloneCard(data.card.name, table.indexOf(suits, choice), data.card.number)
    new_card.skillName = skillName
    new_card.id = data.card.id
    data.card = new_card
    room:sendLog{
      type = "#ChangedJudge",
      from = player.id,
      to = { data.who.id },
      arg2 = new_card:toLogString(),
      arg = skillName,
    }
  end,
})

return mouHongyan
