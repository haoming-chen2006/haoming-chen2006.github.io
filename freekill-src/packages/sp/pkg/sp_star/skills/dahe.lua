local dahe = fk.CreateSkill {
  name = "dahe",
}

Fk:loadTranslationTable{
  ["dahe"] = "大喝",
  [":dahe"] = "出牌阶段限一次，你可以与一名其他角色拼点；若你赢，该角色的非<font color='red'>♥</font>【闪】无效直到回合结束，你可以"..
  "将该角色拼点的牌交给场上一名体力不多于你的角色。若你没赢，你须展示手牌并选择一张弃置。",

  ["#dah"] = "大喝：与一名角色拼点，若赢，其本回合非<font color='red'>♥</font>【闪】无效，若没赢，你弃一张牌",
  ["@@dahe-turn"] = "被大喝",
  ["#dahe-choose"] = "大喝：你可以将%arg交给一名角色",
}

dahe:addEffect("active", {
  anim_type = "offensive",
  prompt = "#dahe",
  card_num = 0,
  target_num = 1,
  can_use = function(self, player)
   return player:usedSkillTimes(dahe.name, Player.HistoryPhase) == 0
  end,
  card_filter = Util.FalseFunc,
  target_filter = function(self, player, to_select, selected)
    return #selected == 0 and player:canPindian(to_select)
  end,
  on_use = function(self, room, effect)
    local player = effect.from
    local target = effect.tos[1]
    local pindian = player:pindian({target}, dahe.name)
    if pindian.results[target].winner == player then
      if not target.dead then
        room:setPlayerMark(target, "@@dahe-turn", 1)
      end
      if not player.dead then
        local card = pindian.results[target].toCard
        if card and room:getCardArea(card) == Card.DiscardPile then
          local targets = table.filter(room.alive_players, function(p)
            return player.hp >= p.hp
          end)
          local to = room:askToChoosePlayers(player, {
            skill_name = dahe.name,
            min_num = 1,
            max_num = 1,
            targets = targets,
            prompt = "#dahe-choose:::"..card:toLogString(),
            cancelable = true,
          })
          if #to > 0 then
            room:obtainCard(to[1], card, true, fk.ReasonGive, player, dahe.name)
          end
        end
      end
    else
      if not player:isKongcheng() and not player.dead then
        player:showCards(player:getCardIds("h"))
        room:askToDiscard(player, {
          min_num = 1,
          max_num = 1,
          include_equip = false,
          skill_name = dahe.name,
          cancelable = false,
        })
      end
    end
  end,
})

dahe:addEffect(fk.PreCardEffect, {
  can_refresh = function(self, event, target, player, data)
  return target == player and player:getMark("@@dahe-turn") > 0 and
    data.card.name == "jink" and data.card.suit ~= Card.Heart
  end,
  on_refresh = function (self, event, target, player, data)
    data.nullified = true
  end,
})

return dahe
