local danxin = fk.CreateSkill {
  name = "danxinl",
}

Fk:loadTranslationTable{
  ["danxinl"] = "丹心",
  [":danxinl"] = "你可以将一张牌当【推心置腹】使用，你须展示获得和给出的牌，以此法得到<font color='red'>♥</font>牌的角色回复1点体力，"..
  "此牌结算后，本回合内你计算与此牌目标的距离+1。",

  ["#danxinl"] = "丹心：将一张牌当【推心置腹】使用，得到<font color='red'>♥</font>牌的角色回复1点体力",

  ["$danxinl1"] = "为国清弊，粉身又有何惧？",
  ["$danxinl2"] = "兴汉除奸，丹心可鉴世人。",
}

danxin:addEffect("viewas", {
  anim_type = "support",
  prompt = "#danxinl",
  handly_pile = true,
  card_filter = function(self, player, to_select, selected)
    return #selected == 0
  end,
  view_as = function (self, player, cards)
    if #cards ~= 1 then return end
    local card = Fk:cloneCard("sincere_treat")
    card.skillName = danxin.name
    card:addSubcards(cards)
    return card
  end,
  before_use = function (self, player, use)
    use.extra_data = use.extra_data or {}
    use.extra_data.danxinl_user = player.id
  end,
  after_use = function (self, player, use)
    if not player.dead then
      for _, p in ipairs(use.tos) do
        if not p.dead then
          player.room:addTableMark(player, "danxinl-turn", p.id)
        end
      end
    end
  end,
})

danxin:addEffect("distance", {
  correct_func = function(self, from, to)
    return #table.filter(from:getTableMark("danxinl-turn"), function (id)
      return id == to.id
    end)
  end,
})

danxin:addEffect(fk.AfterCardsMove, {
  mute = true,
  is_delay_effect = true,
  can_trigger = function(self, event, target, player, data)
    local e = player.room.logic:getCurrentEvent():findParent(GameEvent.CardEffect)
    if e then
      local use = e.data
      if table.contains(use.card.skillNames, danxin.name) then
        local ids = {}
        for _, move in ipairs(data) do
          if move.to == player and move.toArea == Card.PlayerHand and move.skillName == "sincere_treat_skill" then
            for _, info in ipairs(move.moveInfo) do
              if table.contains(player:getCardIds("h"), info.cardId) then
                table.insertIfNeed(ids, info.cardId)
              end
            end
          end
        end
        if #ids > 0 then
          event:setCostData(self, {cards = ids})
          return true
        end
      end
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local ids = event:getCostData(self).cards
    player:showCards(ids)
    local e = room.logic:getCurrentEvent():findParent(GameEvent.CardEffect)
    if e then
      local use = e.data
      if not player.dead and player:isWounded() and
        table.find(ids, function (id)
          return Fk:getCardById(id).suit == Card.Heart
        end) then
        room:recover{
          num = 1,
          skillName = danxin.name,
          who = player,
          recoverBy = room:getPlayerById(use.extra_data.danxinl_user),
        }
      end
    end
  end,
})

return danxin
