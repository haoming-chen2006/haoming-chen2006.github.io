local mengjin = fk.CreateSkill({
  name = "mengjin",
})

Fk:loadTranslationTable{
  ["mengjin"] = "猛进",
  [":mengjin"] = "每当你使用的【杀】被目标角色使用的【闪】抵消时，你可以弃置其一张牌。",

  ["#mengjin-invoke"] = "猛进：你可以弃置 %dest 一张牌 ",

  ["$mengjin1"] = "我要杀你们个片甲不留！",
  ["$mengjin2"] = "你，可敢挡我？",
}

mengjin:addEffect(fk.CardEffectCancelledOut, {
  anim_type = "offensive",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(mengjin.name) and
      data.card.trueName == "slash" and not data.to:isNude() and not data.to.dead
  end,
  on_cost = function (self, event, target, player, data)
    if player.room:askToSkillInvoke(player, {
      skill_name = mengjin.name,
      prompt = "#mengjin-invoke::"..data.to.id,
    }) then
      event:setCostData(self, { tos = {data.to} })
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local card = room:askToChooseCard(player, {
      target = data.to,
      skill_name = mengjin.name,
      flag = "he",
    })
    room:throwCard(card, mengjin.name, data.to, player)
  end,
})

mengjin:addAI(Fk.Ltk.AI.newInvokeStrategy{
  think = function(self, ai)
    local data = ai.room.logic:getCurrentEvent().data
    local player = ai.player
    local ret, benefit = player.ai:askToChooseCards({
      cards = data.to:getCardIds("he"),
      skill_name = mengjin.name,
      data = {
        min = 1,
        toArea = Card.DiscardPile,
        reason = fk.ReasonDiscard,
        proposer = player,
      },
    })
    local val = ai:getBenefitOfEvents(function(logic)
      logic:throwCard(ret, mengjin.name, data.to, player)
    end)
    return val >= 0
  end,
})

return mengjin
