
local zhongyong = fk.CreateSkill {
  name = "zhongyong",
}

Fk:loadTranslationTable{
  ["zhongyong"] = "忠勇",
  [":zhongyong"] = "当你于出牌阶段内使用的【杀】被目标角色使用的【闪】抵消时，你可以将此【闪】交给除该角色外的一名角色，"..
  "若获得此【闪】的角色不是你，你可以对相同的目标再使用一张【杀】。",

  ["#zhongyong-choose"] = "忠勇：将此【闪】交给除 %dest 以外的角色，若不是你，你可以对其再使用一张【杀】",
  ["#zhongyong-slash"] = "忠勇：你可以对 %dest 再使用一张【杀】",

  ["$zhongyong1"] = "驱刀飞血，直取寇首！",
  ["$zhongyong2"] = "为将军提刀携马，万死不辞！"
}

zhongyong:addEffect(fk.CardEffectCancelledOut, {
  anim_type = "offensive",
  can_trigger = function(self, event, target, player, data)
    if target == player and player:hasSkill(zhongyong.name) and
      data.card.trueName == "slash" and player.phase == Player.Play then
      for _, card in ipairs(data.cardsResponded) do
        if card.trueName == "jink" and player.room:getCardArea(card) == Card.DiscardPile then
          return true
        end
      end
    end
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local to = room:askToChoosePlayers(player, {
      targets = room:getOtherPlayers(data.to, false),
      min_num = 1,
      max_num = 1,
      prompt = "#zhongyong-choose::" .. data.to.id,
      skill_name = zhongyong.name,
      cancelable = true
    })
    if #to > 0 then
      event:setCostData(self, { tos = to })
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local to = event:getCostData(self).tos[1]
    local cards = {}
    for _, card in ipairs(data.cardsResponded) do
      if card.trueName == "jink" and room:getCardArea(card) == Card.DiscardPile then
        table.insertTableIfNeed(cards, Card:getIdList(card))
      end
    end
    room:moveCardTo(cards, Card.PlayerHand, to, fk.ReasonGive, zhongyong.name, nil, true, player)
    if to ~= player and not player.dead and not data.to.dead then
      local use = room:askToUseCard(player, {
        skill_name = zhongyong.name,
        pattern = "slash",
        prompt = "#zhongyong-slash::" .. data.to.id,
        cancelable = true,
        extra_data = {
          must_targets = { data.to.id },
          bypass_distances = true,
          bypass_times = true,
        }
      })
      if use then
        use.extraUse = true
        room:useCard(use)
      end
    end
  end,
})

return zhongyong
