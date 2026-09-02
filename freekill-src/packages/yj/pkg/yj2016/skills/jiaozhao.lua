local jiaozhao = fk.CreateSkill {
  name = "jiaozhao",
  dynamic_desc = function (self, player)
    if player:getMark("danxin") > 0 then
      return "jiaozhao_update"..player:getMark("danxin")
    end
  end,
}

Fk:loadTranslationTable{
  ["jiaozhao"] = "矫诏",
  [":jiaozhao"] = "出牌阶段限一次，你可以展示一张手牌并选择一名距离最近的其他角色，该角色声明一种基本牌的牌名，"..
  "本回合你可以将此牌当声明的牌使用（不能指定自己为目标）。",

  [":jiaozhao_update1"] = "出牌阶段限一次，你可以展示一张手牌并选择一名距离最近的其他角色，该角色声明一种基本牌或普通锦囊牌的牌名，"..
  "本回合你可以将此牌当声明的牌使用（不能指定自己为目标）。",
  [":jiaozhao_update2"] = "出牌阶段限一次，你可以展示一张手牌，然后声明一种基本牌或普通锦囊牌的牌名，"..
  "本回合你可以将此牌当声明的牌使用（不能指定自己为目标）。",

  ["#jiaozhao0"] = "矫诏：展示一张手牌，令一名角色声明一种基本牌",
  ["#jiaozhao1"] = "矫诏：展示一张手牌，令一名角色声明一种基本牌或普通锦囊牌",
  ["#jiaozhao2"] = "矫诏：展示一张手牌，然后声明一种基本牌或普通锦囊牌",
  ["#jiaozhao-use"] = "矫诏：你可以将“矫诏”牌当声明的牌使用",
  ["#jiaozhao-choice"] = "矫诏：声明一种牌名，%src 本回合可以将%arg当此牌使用",
  ["@jiaozhao-inhand-turn"] = "矫诏",

  ["$jiaozhao1"] = "诏书在此，不得放肆！",
  ["$jiaozhao2"] = "妾身也是逼不得已，方才出此下策。",
}

local U = require "packages.utility.utility"

jiaozhao:addEffect("active", {
  anim_type = "special",
  prompt = function (self, player, selected_cards, selected_targets)
    if player:usedEffectTimes(jiaozhao.name, Player.HistoryPhase) == 0 then
      return "#jiaozhao"..player:getMark("danxin")
    else
      return "#jiaozhao-use"
    end
  end,
  card_num = 1,
  can_use = function(self, player)
    if player:usedEffectTimes(jiaozhao.name, Player.HistoryPhase) == 0 then
      return true
    else
      return table.find(player:getCardIds("h"), function (id)
        return Fk:getCardById(id):getMark("jiaozhao-inhand-turn") ~= 0
      end)
    end
  end,
  card_filter = function(self, player, to_select, selected)
    if #selected == 0 and table.contains(player:getCardIds("h"), to_select) then
      if player:usedEffectTimes(jiaozhao.name, Player.HistoryPhase) == 0 then
        return true
      else
        if Fk:getCardById(to_select):getMark("jiaozhao-inhand-turn") ~= 0 then
          local card = Fk:cloneCard(Fk:getCardById(to_select):getMark("jiaozhao-inhand-turn"))
          card.skillName = jiaozhao.name
          card:addSubcard(to_select)
          return card.skill:canUse(player, card)
        end
      end
    end
  end,
  target_filter = function(self, player, to_select, selected, selected_cards)
    if player:usedEffectTimes(jiaozhao.name, Player.HistoryPhase) == 0 then
      if player:getMark("danxin") < 2 then
        return #selected == 0 and to_select ~= player and
          table.every(Fk:currentRoom().alive_players, function (p)
            if p == player then
              return true
            else
              return to_select:distanceTo(player) <= p:distanceTo(player)
            end
          end)
      else
        return false
      end
    elseif #selected_cards == 1 then
      local card = Fk:cloneCard(Fk:getCardById(selected_cards[1]):getMark("jiaozhao-inhand-turn"))
      card.skillName = jiaozhao.name
      card:addSubcards(selected_cards)
      return card.skill:targetFilter(player, to_select, selected, {}, card)
    end
  end,
  feasible = function (self, player, selected, selected_cards)
    if #selected_cards == 1 then
      if player:usedEffectTimes(jiaozhao.name, Player.HistoryPhase) == 0 then
        if player:getMark("danxin") < 2 then
          return #selected == 1
        else
          return #selected == 0
        end
      else
        local card = Fk:cloneCard(Fk:getCardById(selected_cards[1]):getMark("jiaozhao-inhand-turn"))
        card.skillName = jiaozhao.name
        card:addSubcards(selected_cards)
        return card.skill:feasible(player, selected, {}, card)
      end
    end
  end,
  on_use = function(self, room, effect)
    local player = effect.from
    if player:usedEffectTimes(jiaozhao.name, Player.HistoryPhase) == 1 then
      local target = player:getMark("danxin") < 2 and effect.tos[1] or player
      player:showCards(effect.cards)
      local id = effect.cards[1]
      if player.dead or target.dead or not table.contains(player:getCardIds("h"), id) then return end
      local choice = U.askForChooseCardNames(room, target,
        player:getMark("danxin") < 1 and Fk:getAllCardNames("b") or Fk:getAllCardNames("bt"),
        1,
        1,
        jiaozhao.name,
        "#jiaozhao-choice:"..player.id.."::"..Fk:getCardById(id):toLogString()
      )[1]
      room:sendLog{
        type = "#Choice",
        from = target.id,
        arg = choice,
        toast = true,
      }
      room:setCardMark(Fk:getCardById(id), "jiaozhao-inhand-turn", choice)
      room:setCardMark(Fk:getCardById(id), "@jiaozhao-inhand-turn", Fk:translate(choice))
    else
      local card = Fk:cloneCard(Fk:getCardById(effect.cards[1]):getMark("jiaozhao-inhand-turn"))
      card.skillName = jiaozhao.name
      card:addSubcards(effect.cards)
      room:useCard{
        from = player,
        tos = effect.tos,
        card = card,
      }
    end
  end,
})
jiaozhao:addEffect("prohibit", {
  is_prohibited = function (self, from, to, card)
    return card and table.contains(card.skillNames, jiaozhao.name) and from == to
  end,
})

return jiaozhao
