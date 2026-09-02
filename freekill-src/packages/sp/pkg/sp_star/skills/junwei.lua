local junwei = fk.CreateSkill {
  name = "junwei",
}

Fk:loadTranslationTable{
  ["junwei"] = "军威",
  [":junwei"] = "结束阶段开始时，你可以将三张“锦”置入弃牌堆。若如此做，你须指定一名角色并令其选择一项：1.亮出一张【闪】，然后由你交给"..
  "任意一名角色。2.该角色失去1点体力，然后由你选择将其装备区的一张牌移出游戏，在该角色的回合结束后，将以此法移出游戏的装备牌移回原处。",

  ["#junwei-choose"] = "军威：移去三张“锦”，令一名角色选择交出一张【闪】或失去体力",
  ["#junwei-ask"] = "军威：展示一张【闪】并由 %src 交给一名角色，或点“取消”失去1点体力并被移除一张装备直到你回合结束",
  ["#junwei-give"] = "军威：将%arg交给一名角色",
}

junwei:addEffect(fk.EventPhaseStart, {
  anim_type = "control",
  can_trigger = function(self, event, target, player, data)
    return target == player and player.phase == Player.Finish and #player:getPile("ganning_jin") > 2
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local tos, cards = room:askToChooseCardsAndPlayers(player, {
      min_card_num = 3,
      max_card_num = 3,
      min_num = 1,
      max_num = 1,
      targets = room.alive_players,
      pattern = ".|.|.|ganning_jin",
      expand_pile = "ganning_jin",
      skill_name = junwei.name,
      prompt = "#junwei-choose",
      cancelable = true,
    })
    if #tos > 0 and #cards == 3 then
      event:setCostData(self, {tos = tos, cards = cards})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local to = event:getCostData(self).tos[1]
    room:moveCardTo(event:getCostData(self).cards, Card.DiscardPile, nil, fk.ReasonPutIntoDiscardPile, junwei.name, nil, true, player)
    if to.dead then return end
    if player.dead then
      room:loseHp(to, 1, junwei.name)
      return
    end
    local card = {}
    if not to:isKongcheng() then
      card = room:askToCards(to, {
        min_num = 1,
        max_num = 1,
        pattern = "jink",
        prompt = "#junwei-ask:"..player.id,
        skill_name = junwei.name,
      })
    end
    if #card > 0 then
      to:showCards(card)
      if player.dead or to.dead or not table.contains(to:getCardIds("h"), card[1]) then return end
      local p = room:askToChoosePlayers(player, {
        skill_name = junwei.name,
        min_num = 1,
        max_num = 1,
        targets = room.alive_players,
        prompt = "#junwei-give:::" .. Fk:getCardById(card[1]):toLogString(),
        cancelable = false,
      })[1]
      if p ~= to then
        room:moveCardTo(card, Card.PlayerHand, player, fk.ReasonGive, junwei.name, nil, true, player)
      end
    else
      room:loseHp(to, 1, junwei.name)
      if not to.dead and not player.dead and #to:getCardIds("e") > 0 then
        local id = room:askToChooseCard(player, {
          target = to,
          flag = "e",
          skill_name = junwei.name,
        })
        to:addToPile(junwei.name, id, true, junwei.name)
      end
    end
  end,
})

junwei:addEffect(fk.TurnEnd, {
  mute = true,
  is_delay_effect = true,
  can_trigger = function(self, event, target, player, data)
    return target == player and #player:getPile("junwei") > 0
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    for i = #player:getPile("junwei"), 1, -1 do
      if player.dead then return end
      room:moveCardIntoEquip(player, player:getPile("junwei")[i], junwei.name, true, player)
    end
  end,
})

return junwei
