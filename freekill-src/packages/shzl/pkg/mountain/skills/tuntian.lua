local tuntian = fk.CreateSkill {
  name = "tuntian",
  derived_piles = "dengai_field",
}

Fk:loadTranslationTable{
  ["tuntian"] = "屯田",
  [":tuntian"] = "当你于回合外失去牌后，你可以进行判定：若结果不为<font color='red'>♥</font>，你将生效后的判定牌置于你的武将牌上，称为“田”；"..
  "你计算与其他角色的距离-X（X为“田”的数量）。",

  ["dengai_field"] = "田",

  ["$tuntian1"] = "休养生息，备战待敌。",
  ["$tuntian2"] = "锄禾日当午，汗滴禾下土。",
}

tuntian:addEffect(fk.AfterCardsMove, {
  can_trigger = function(self, event, target, player, data)
    if player:hasSkill(tuntian.name) and player.room.current ~= player then
      for _, move in ipairs(data) do
        if move.from == player then
          for _, info in ipairs(move.moveInfo) do
            if info.fromArea == Card.PlayerHand or info.fromArea == Card.PlayerEquip then
              return true
            end
          end
        end
      end
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local judge = {
      who = player,
      reason = tuntian.name,
      pattern = ".|.|^heart",
    }
    room:judge(judge)
  end,
})
tuntian:addEffect(fk.FinishJudge, {
  can_refresh = function(self, event, target, player, data)
    return target == player and player:hasSkill(tuntian.name) and data.reason == tuntian.name
  end,
  on_refresh = function(self, event, target, player, data)
    if data:matchPattern() and player.room:getCardArea(data.card) == Card.Processing then
      player:addToPile("dengai_field", data.card, true, tuntian.name)
    end
  end,
})
tuntian:addEffect("distance", {
  correct_func = function(self, from, to, card)
    if from:hasSkill(tuntian.name) then
      return -#table.filter(from:getPile("dengai_field"), function(id)
        return not (card and table.contains(Card:getIdList(card), id))
      end)
    end
  end,
})

return tuntian
