local jishe = fk.CreateSkill {
  name = "jishe",
}

Fk:loadTranslationTable{
  ["jishe"] = "极奢",
  [":jishe"] = "出牌阶段，若你的手牌上限大于0，你可以摸一张牌，然后本回合你的手牌上限-1；结束阶段，若你没有手牌，你可以横置至多X名角色"..
  "（X为你的体力值）。",

  ["#jishe"] = "极奢：摸一张牌，本回合手牌上限-1",
  ["#jishe-choose"] = "极奢：你可以横置至多%arg名角色",

  ["$jishe1"] = "孙吴正当盛世，兴些土木又何妨？",
  ["$jishe2"] = "当再建新殿，扬我国威！",
}

jishe:addEffect("active", {
  anim_type = "drawcard",
  prompt = "#jishe",
  card_num = 0,
  target_num = 0,
  can_use = function(self, player)
    return player:getMaxCards() > 0
  end,
  card_filter = Util.FalseFunc,
  on_use = function(self, room, effect)
    effect.from:drawCards(1, jishe.name)
  end,
})
jishe:addEffect("maxcards", {
  correct_func = function(self, player)
    return -player:usedEffectTimes(jishe.name, Player.HistoryTurn)
  end,
})
jishe:addEffect(fk.EventPhaseStart, {
  anim_type = "control",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(jishe.name) and player.phase == Player.Finish and
      player:isKongcheng() and table.find(player.room.alive_players, function (p)
        return not p.chained
      end)
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local targets = table.filter(room.alive_players, function (p)
      return not p.chained
    end)
    local tos = room:askToChoosePlayers(player, {
      skill_name = jishe.name,
      min_num = 1,
      max_num = player.hp,
      targets = targets,
      prompt = "#jishe-choose:::"..player.hp,
      cancelable = true,
    })
    if #tos > 0 then
      room:sortByAction(tos)
      event:setCostData(self, {tos = tos})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    for _, to in ipairs(event:getCostData(self).tos) do
      if not to.dead and not to.chained then
        to:setChainState(true)
      end
    end
  end,
})

return jishe
