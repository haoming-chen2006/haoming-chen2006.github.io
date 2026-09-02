local mouQingjian = fk.CreateSkill({
  name = "mou__qingjian",
})

Fk:loadTranslationTable{
  ["mou__qingjian"] = "清俭",
  [":mou__qingjian"] = "当一张牌不因使用而进入弃牌堆后，若你的“清俭”数不大于X（X为你的体力值-1，且至少为1），则你将此牌置于你的武将牌上，" ..
  "称为“清俭”；出牌阶段结束时，你将你的所有“清俭”分配给任意角色。",

  ["$mou__qingjian1"] = "如今乱世，还是当以俭治军。",
  ["$mou__qingjian2"] = "浮奢之举，非是正道。",
}

mouQingjian:addEffect(fk.AfterCardsMove, {
  anim_type = "drawcard",
  can_trigger = function (self, event, target, player, data)
    return
      player:hasSkill(self) and
      #player:getPile("mou__qingjian") < math.max(player.hp - 1, 1) and
      table.find(
        data,
        function(info)
          return
            (info.moveReason ~= fk.ReasonUse or not player.room.logic:getCurrentEvent():findParent(GameEvent.UseCard, true)) and
            info.toArea == Card.DiscardPile and
            table.find(info.moveInfo, function(moveInfo) return player.room:getCardArea(moveInfo.cardId) == Card.DiscardPile end) ~= nil
        end
      )
  end,
  on_cost = Util.TrueFunc,
  on_use = function (self, event, target, player, data)
    local room = player.room
    local toPut = {}
    for _, info in ipairs(data) do
      if
        (info.moveReason ~= fk.ReasonUse or not room.logic:getCurrentEvent():findParent(GameEvent.UseCard, true)) and
        info.toArea == Card.DiscardPile
      then
        local cardsInDiscardPile = table.filter(
          info.moveInfo,
          function(moveInfo) return room:getCardArea(moveInfo.cardId) == Card.DiscardPile end
        )

        local diff = math.max(player.hp - 1, 1) - #player:getPile("mou__qingjian")
        if #cardsInDiscardPile > 0 then
          table.insertTable(
            toPut,
            table.map(
              table.slice(cardsInDiscardPile, 1, diff + 1),
              function(moveInfo) return moveInfo.cardId end
            )
          )

          if #toPut >= diff then
            break
          end
        end
      end
    end

    player:addToPile("mou__qingjian", toPut, true, mouQingjian.name)
  end,
})

mouQingjian:addEffect(fk.EventPhaseEnd, {
  anim_type = "drawcard",
  can_trigger = function (self, event, target, player, data)
    return target == player and player:hasSkill(mouQingjian.name) and player.phase == Player.Play and #player:getPile("mou__qingjian") > 0
  end,
  on_cost = Util.TrueFunc,
  on_use = function (self, event, target, player, data)
    local room = player.room
    local num = #player:getPile("mou__qingjian")
    room:askToYiji(
      player,
      {
        targets = room.alive_players,
        cards = player:getPile("mou__qingjian"),
        skill_name = mouQingjian.name,
        min_num = num,
        max_num = num,
        expand_pile = "mou__qingjian"
      }
    )
  end,
})

return mouQingjian
