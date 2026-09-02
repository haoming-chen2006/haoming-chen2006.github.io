local tanhu = fk.CreateSkill {
  name = "tanhu",
}

Fk:loadTranslationTable{
  ["tanhu"] = "探虎",
  [":tanhu"] = "出牌阶段限一次，你可与一名其他角色拼点。若你赢，你获得以下技能直到回合结束：你与该角色的距离视为1，你对该角色使用的"..
  "非延时类锦囊牌不能被抵消。",

  ["#tanhu"] = "探虎：与一名角色拼点，若赢，你与其距离视为1且你对其使用普通锦囊牌不能被抵消",
}

tanhu:addEffect("active", {
  anim_type = "control",
  prompt = "#tanhu",
  card_num = 0,
  target_num = 1,
  can_use = function(self, player)
    return player:usedSkillTimes(tanhu.name, Player.HistoryPhase) == 0
  end,
  card_filter = Util.FalseFunc,
  target_filter = function(self, player, to_select, selected, selected_cards)
    return #selected == 0 and to_select ~= player and player:canPindian(to_select)
  end,
  on_use = function(self, room, effect)
    local player = effect.from
    local target = effect.tos[1]
    local pindian = player:pindian({target}, tanhu.name)
    if pindian.results[target].winner == player and not player.dead then
      room:addTableMarkIfNeed(player, "tanhu-turn", target.id)
    end
  end,
})

tanhu:addEffect("distance", {
  fixed_func = function(self, from, to)
    if table.contains(from:getTableMark("tanhu-turn"), to.id) then
      return 1
    end
  end,
})

tanhu:addEffect(fk.CardUsing, {
  anim_type = "offensive",
  is_delay_effect = true,
  can_trigger = function(self, event, target, player, data)
    return target == player and data.card:isCommonTrick() and #data.tos > 0 and
      table.find(data.tos, function(p)
        return table.contains(player:getTableMark("tanhu-turn"), p.id)
      end)
    end,
  on_use = function(self, event, target, player, data)
    data.unoffsetableList = table.simpleClone(player.room.players)
  end,
})

return tanhu
