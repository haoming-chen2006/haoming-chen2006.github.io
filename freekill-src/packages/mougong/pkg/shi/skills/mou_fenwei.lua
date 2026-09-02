local mouFenwei = fk.CreateSkill({
  name = "mou__fenwei",
  tags = { Skill.Limited },
})

Fk:loadTranslationTable{
  ["mou__fenwei"] = "奋威",
  [":mou__fenwei"] = "限定技，出牌阶段，你可以将至多三张牌分别置于等量名角色的武将牌上，称为“威”，然后你摸等量牌。" ..
  "有“威”的角色成为锦囊牌的目标时，你须选择一项：1. 令其获得“威”；2. 移去其“威”，取消此目标。",
  ["@mou__fenwei"] = "威",
  ["#mou__fenwei_trigger"] = "奋威",
  ["#mou__fenwei-choice"] = "奋威：1. 令%dest获得“威”；2. 移去“威”，令%arg的目标取消%dest",
  ["#mou__fenwei_get"] = "令其获得“威”",
  ["#mou__fenwei_cancel"] = "移去“威”,取消目标",

  ["$mou__fenwei1"] = "舍身护主，扬吴将之风！",
  ["$mou__fenwei2"] = "袭军挫阵，奋江东之威！",
}

mouFenwei:addEffect("active", {
  anim_type = "control",
  min_card_num = 1,
  max_card_num = 1,
  min_target_num = 1,
  max_target_num = 3,
  target_filter = function(self, player, to_select, selected)
    return #selected < 3
  end,
  card_filter = function(self, player, to_select, selected)
    return #selected < 3
  end,
  feasible = function(self, player, selected, selected_cards)
    return #selected >= 1 and #selected <= 3 and #selected_cards == #selected
  end,
  can_use = function(self, player)
    return player:usedEffectTimes(self.name, Player.HistoryGame) == 0 and not player:isNude()
  end,
  on_use = function(self, room, effect)
    ---@type string
    local skillName = mouFenwei.name
    local player = effect.from
    local moves = {}
    for i, to in ipairs(effect.tos) do
      table.insert(moves, {
        ids = { effect.cards[i] },
        from = player,
        to = to,
        toArea = Card.PlayerSpecial,
        moveReason = fk.ReasonPut,
        skillName = skillName,
        specialName = "@mou__fenwei",
        moveVisible = true,
        proposer = player,
      })
    end
    room:moveCards(table.unpack(moves))
    if not player.dead then
      player:drawCards(#effect.cards, skillName)
    end
  end,
})

mouFenwei:addEffect(fk.TargetConfirming, {
  anim_type = "defensive",
  can_trigger = function(self, event, target, player, data)
    return data.card.type == Card.TypeTrick and not data.cancelled and
      player:hasSkill(mouFenwei.name) and #target:getPile("@mou__fenwei") > 0
  end,
  on_cost = Util.TrueFunc,
  on_use = function(self, event, target, player, data)
    ---@type string
    local skillName = mouFenwei.name
    local room = player.room
    local choice = room:askToChoice(
      player,
      {
        choices = {"#mou__fenwei_get" , "#mou__fenwei_cancel"},
        skill_name = skillName,
        prompt = "#mou__fenwei-choice::" .. target.id .. ":" .. data.card:toLogString()
      }
    )
    if choice == "#mou__fenwei_get" then
      room:obtainCard(target, target:getPile("@mou__fenwei"), true, fk.ReasonPrey)
    else
      room:moveCards({
        from = target.id,
        ids = target:getPile("@mou__fenwei"),
        toArea = Card.DiscardPile,
        moveReason = fk.ReasonPutIntoDiscardPile,
      })
      data:cancelCurrentTarget()
    end
  end,
})

return mouFenwei
