local mouYanyu = fk.CreateSkill({
  name = "mou__yanyu",
})

Fk:loadTranslationTable{
  ["mou__yanyu"] = "燕语",
  ["#mou__yanyu_trigger"] = "燕语",
  [":mou__yanyu"] = "出牌阶段限两次，你可以弃置一张【杀】并摸一张牌。出牌阶段结束时，" ..
  "你可以令一名其他角色摸X张牌（X为你此回合以此法弃置【杀】的数量的三倍）。",

  ["#mou__yanyu-active"] = "发动 燕语，弃置一张【杀】，然后摸一张牌",
  ["#mou__yanyu-draw"] = "燕语：你可以选择一名其他角色，令其摸%arg张牌",

  ["$mou__yanyu1"] = "燕语呢喃唤君归！",
  ["$mou__yanyu2"] = "燕燕于飞，差池其羽。",
}

mouYanyu:addEffect("active", {
  anim_type = "drawcard",
  prompt = "#mou__yanyu-active",
  card_num = 1,
  target_num = 0,
  times = function(self, player)
    return player.phase == Player.Play and 2 - player:usedEffectTimes(self.name, Player.HistoryPhase) or -1
  end,
  can_use = function(self, player)
    return player:usedEffectTimes(self.name, Player.HistoryPhase) < 2
  end,
  card_filter = function(self, player, to_select, selected)
    return
      #selected == 0 and
      Fk:getCardById(to_select).trueName == "slash" and
      not player:prohibitDiscard(Fk:getCardById(to_select))
  end,
  on_use = function(self, room, effect)
    ---@type string
    local skillName = mouYanyu.name
    local from = effect.from
    room:throwCard(effect.cards, skillName, from, from)
    room:addPlayerMark(from, "mou__yanyu-turn")
    if not from.dead then
      room:drawCards(from, 1, skillName)
    end
  end,
})

mouYanyu:addEffect(fk.EventPhaseEnd, {
  anim_type = "support",
  can_trigger = function(self, event, target, player, data)
    return
      target == player and
      player:hasSkill(mouYanyu.name) and
      player.phase == player.Play and
      player:getMark("mou__yanyu-turn") > 0
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local to = room:askToChoosePlayers(
      player,
      {
        targets = room:getOtherPlayers(player, false),
        min_num = 1,
        max_num = 1,
        prompt = "#mou__yanyu-draw:::" .. 3 * player:getMark("mou__yanyu-turn"),
        skill_name = mouYanyu.name,
        cancelable = true
      }
    )
    if #to > 0 then
      event:setCostData(self, to[1])
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    event:getCostData(self):drawCards(3 * player:getMark("mou__yanyu-turn"), mouYanyu.name)
  end,
})

return mouYanyu
