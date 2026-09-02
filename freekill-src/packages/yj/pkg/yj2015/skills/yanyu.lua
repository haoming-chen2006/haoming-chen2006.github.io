local yanyu = fk.CreateSkill {
  name = "yanyu",
}

Fk:loadTranslationTable{
  ["yanyu"] = "燕语",
  [":yanyu"] = "出牌阶段，你可以重铸【杀】；出牌阶段结束时，若你此阶段内因此重铸过至少两张【杀】，则你可以令一名男性角色摸两张牌。",

  ["#yanyu"] = "燕语：你可以重铸【杀】",
  ["#yanyu-draw"] = "燕语：你可以令一名男性角色摸两张牌",

  ["$yanyu1"] = "伴君一生不寂寞。",
  ["$yanyu2"] = "感君一回顾，思君朝与暮。",
}

yanyu:addEffect("active", {
  anim_type = "drawcard",
  prompt = "#yanyu",
  card_num = 1,
  target_num = 0,
  card_filter = function(self, player, to_select, selected)
    return #selected == 0 and Fk:getCardById(to_select).trueName == "slash"
  end,
  on_use = function(self, room, effect)
    room:recastCard(effect.cards, effect.from, yanyu.name)
  end,
})

yanyu:addEffect(fk.EventPhaseEnd, {
  anim_type = "support",
  can_trigger = function(self, event, target, player, data)
    return target == player and player.phase == player.Play and
      player:usedEffectTimes(yanyu.name, Player.HistoryPhase) > 1 and
      table.find(player.room:getOtherPlayers(player, false), function(p)
        return p:isMale()
      end)
    end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local targets = table.filter(room:getOtherPlayers(player, false), function(p)
      return p:isMale()
    end)
    local to = room:askToChoosePlayers(player, {
      skill_name = yanyu.name,
      targets = targets,
      min_num = 1,
      max_num = 1,
      prompt = "#yanyu-draw",
      cancelable = true,
    })
    if #to > 0 then
      event:setCostData(self, {tos = to})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    event:getCostData(self).tos[1]:drawCards(2, yanyu.name)
  end,
})

return yanyu
