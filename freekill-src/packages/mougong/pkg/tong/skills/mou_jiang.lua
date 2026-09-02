local mouJiang = fk.CreateSkill({
  name = "mou__jiang",
})

Fk:loadTranslationTable{
  ["#mou__jiang_trigger"] = "激昂",
  ["#mou__jiang-viewas"] = "发动 激昂，将所有手牌当【决斗】使用",
  ["#mou__jiang-choose"] = "你可以发动激昂，失去1点体力来为【%arg】额外指定1个目标",
  ["mou__jiang"] = "激昂",
  [":mou__jiang"] = "当你使用【决斗】时，你可以失去1点体力，额外选择一个目标。"..
  "当你使用【决斗】或红色【杀】指定目标后，或成为【决斗】或红色【杀】的目标后，你摸一张牌。"..
  "出牌阶段限一次，你可以将所有手牌当【决斗】使用。",

  ["$mou__jiang1"] = "义武奋扬，荡尽犯我之寇！",
  ["$mou__jiang2"] = "锦绣江东，岂容小丑横行！",
}

mouJiang:addEffect("viewas", {
  anim_type = "offensive",
  prompt = "#mou__jiang-viewas",
  filter_pattern = function (self, player, card_name)
    local cards = player:getCardIds("h")
    return {
      max_num = #cards,
      min_num = #cards,
      pattern = ".|.|.|hand",
      subcards = cards
    }
  end,
  card_filter = Util.FalseFunc,
  view_as = function(self, player, cards)
    local card = Fk:cloneCard("duel")
    card:addSubcards(player:getCardIds("h"))
    card.skillName = self.name
    return card
  end,
  times = function (self, player)
    if player.phase == Player.Play then
      local X = 1
      if player:usedSkillTimes("mou__zhiba", Player.HistoryGame) > 0 then
        local num1 = 0
        for _, p in ipairs(Fk:currentRoom().alive_players) do
          if p.kingdom == "wu" then
            num1 = num1 + 1
          end
        end
        X = num1
      end
      return math.max(0, X - player:usedEffectTimes(self.name, Player.HistoryPhase))
    end
    return -1
  end,
  enabled_at_play = function(self, player)
    local X = 1
    if player:usedSkillTimes("mou__zhiba", Player.HistoryGame) > 0 then
      local num1 = 0
      for _, p in ipairs(Fk:currentRoom().alive_players) do
        if p.kingdom == "wu" then
          num1 = num1 + 1
        end
      end
      X = num1
    end
    return player:usedEffectTimes(self.name, Player.HistoryPhase) < X and not player:isKongcheng()
  end,
})

mouJiang:addEffect(fk.AfterCardTargetDeclared, {
  anim_type = "drawcard",
  can_trigger = function(self, event, target, player, data)
    return
      target == player and
      player:hasSkill(mouJiang.name) and
      data.card.trueName == "duel" and
      #data:getExtraTargets() > 0
  end,
  on_cost = function(self, event, target, player, data)
    local to = player.room:askToChoosePlayers(
      player,
      {
        targets = data:getExtraTargets(),
        min_num = 1,
        max_num = 1,
        prompt = "#mou__jiang-choose:::" .. data.card:toLogString(),
        skill_name = mouJiang.name,
        cancelable = true
      }
    )
    if #to > 0 then
      event:setCostData(self, to)
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    ---@type string
    local skillName = mouJiang.name
    player:broadcastSkillInvoke(skillName)
    local targets = table.simpleClone(event:getCostData(self))
    player.room:loseHp(player, 1)
    for _, p in ipairs(targets) do
      data:addTarget(p)
    end
  end,
})

local mouJiangAimCanTrigger = function(self, event, target, player, data)
  return
    target == player and
    player:hasSkill(mouJiang.name) and
    (
      (data.card.trueName == "slash" and data.card.color == Card.Red) or
      data.card.name == "duel"
    )
end

local mouJiangAimOnUse = function(self, event, target, player, data)
  player:drawCards(1, mouJiang.name)
end

mouJiang:addEffect(fk.TargetSpecified, {
  anim_type = "drawcard",
  can_trigger = mouJiangAimCanTrigger,
  on_cost = Util.TrueFunc,
  on_use = mouJiangAimOnUse,
})

mouJiang:addEffect(fk.TargetConfirmed, {
  anim_type = "drawcard",
  can_trigger = mouJiangAimCanTrigger,
  on_cost = Util.TrueFunc,
  on_use = mouJiangAimOnUse,
})

return mouJiang
