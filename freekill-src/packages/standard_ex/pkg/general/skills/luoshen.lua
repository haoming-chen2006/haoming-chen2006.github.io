
local luoshen = fk.CreateSkill{
  name = "ex__luoshen",
}

Fk:loadTranslationTable{
  ["ex__luoshen"] = "洛神",
  [":ex__luoshen"] = "准备阶段，你可以进行判定，当黑色判定牌生效后，你获得之并可以重复此流程。你以此法获得的牌在本回合不计入手牌上限。",

  ["@@ex__luoshen-inhand-turn"] = "洛神",

  ["$ex__luoshen1"] = "屏翳收风，川后静波。",
  ["$ex__luoshen2"] = "冯夷鸣鼓，女娲清歌。",
}

luoshen:addEffect(fk.EventPhaseStart, {
  anim_type = "drawcard",
  can_trigger = function(self, event, target, player, data)
    return target == player and player.phase == Player.Start and player:hasSkill(luoshen.name)
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    while true do
      local judge = {
        who = player,
        reason = luoshen.name,
        pattern = ".|.|black",
      }
      room:judge(judge)
      if not judge:matchPattern() or player.dead or
        not room:askToSkillInvoke(player, {
          skill_name = luoshen.name,
        }) then
        break
      end
    end
  end,
})

luoshen:addEffect(fk.FinishJudge, {
  mute = true,
  is_delay_effect = true,
  can_trigger = function(self, event, target, player, data)
    return target == player and data.reason == luoshen.name and
      data.card.color == Card.Black and player.room:getCardArea(data.card) == Card.Processing
  end,
  on_use = function(self, event, target, player, data)
    player.room:obtainCard(player, data.card, true, nil, player, luoshen.name, "@@ex__luoshen-inhand-turn")
  end,
})

luoshen:addEffect("maxcards", {
  exclude_from = function(self, player, card)
    return card:getMark("@@ex__luoshen-inhand-turn") > 0
  end,
})

return luoshen
