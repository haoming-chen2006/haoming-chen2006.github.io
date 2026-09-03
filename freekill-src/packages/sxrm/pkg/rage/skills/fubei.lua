
local fubei = fk.CreateSkill{
  name = "fubei",
}

Fk:loadTranslationTable{
  ["fubei"] = "伏备",
  [":fubei"] = "出牌阶段限一次，你可以将手牌摸至体力上限，然后将两张牌正面朝上置于牌堆顶前十张的任意位置（对其他角色可见）；"..
  "每名角色回合结束时，若牌堆顶的牌正面朝上，你须对其造成1点伤害。",

  ["#fubei"] = "伏备：将手牌摸至体力上限，然后将两张牌正面朝上置于牌堆顶前十张的任意位置",
  ["#fubei-put"] = "伏备：请将两张牌正面朝上置于牌堆顶前十张",
  ["#fubei_toast"] = "%from 将 %card 置于牌堆顶第%arg张",
}

fubei:addEffect("active", {
  anim_type = "drawcard",
  prompt = "#fubei",
  card_num = 0,
  target_num = 0,
  can_use = function(self, player)
    return player:usedSkillTimes(fubei.name, Player.HistoryPhase) == 0 and
      player:getHandcardNum() < player.maxHp
  end,
  card_filter = Util.FalseFunc,
  target_filter = Util.FalseFunc,
  on_use = function(self, room, effect)
    local player = effect.from
    player:drawCards(player.maxHp - player:getHandcardNum(), fubei.name)
    for _ = 1, 2 do
      if player:isNude() then return end
      local success, dat = room:askToUseActiveSkill(player, {
        skill_name = "#fubei_active",
        prompt = "#fubei-put",
        cancelable = false,
      })
      if not (success and dat) then
        dat = {}
        dat.cards = { player:getCardIds("he")[1] }
        dat.interaction = 1
      end
      room:moveCards({
        ids = dat.cards,
        from = player,
        toArea = Card.DrawPile,
        moveReason = fk.ReasonJustMove,
        skillName = fubei.name,
        drawPilePosition = dat.interaction,
        moveMark = fubei.name,
      })
      room:sendLog{
        type = "#fubei_toast",
        from = player.id,
        arg = dat.interaction,
        card = dat.cards,
        toast = true,
      }
    end
  end,
})

fubei:addEffect(fk.TurnEnd, {
  anim_type = "offensive",
  can_trigger = function (self, event, target, player, data)
    return player:hasSkill(fubei.name) and
      #player.room.draw_pile > 0 and player:cardVisible(player.room.draw_pile[1]) and
      not target.dead
  end,
  on_cost = function (self, event, target, player, data)
    event:setCostData(self, { tos = { target } })
    return true
  end,
  on_use = function (self, event, target, player, data)
    player.room:damage({
      from = player,
      to = target,
      damage = 1,
      skillName = fubei.name,
    })
  end,
})

fubei:addEffect(fk.AfterCardsMove, {
  can_refresh = function (self, event, target, player, data)
    return player.room:getBanner(fubei.name) and player.seat == 1
  end,
  on_refresh = function (self, event, target, player, data)
    local room = player.room
    local banner = room:getBanner(fubei.name)
    for _, move in ipairs(data) do
      if move.toArea ~= Card.DrawPile then
        for _, info in ipairs(move.moveInfo) do
          if info.fromArea == Card.DrawPile then
            table.removeOne(banner, info.cardId)
            room:setCardMark(Fk:getCardById(info.cardId), fubei.name, 0)
          end
        end
      end
    end
    room:setBanner(fubei.name, #banner == 0 and nil or banner)
  end,
})

fubei:addEffect("visibility", {
  card_visible = function (self, player, card)
    if card:getMark(fubei.name) ~= 0 then
      return true
    end
  end,
})

return fubei
