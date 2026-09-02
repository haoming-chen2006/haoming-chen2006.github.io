Fk:loadTranslationTable{
  ["ex__fanjian"] = "反间",
  [":ex__fanjian"] = "出牌阶段限一次，你可以展示一张手牌并交给一名其他角色，然后其选择：1.展示所有手牌，弃置所有与你以展示的牌花色相同的牌；"..
  "2.失去1点体力。",

  ["#ex__fanjian"] = "反间：展示一张手牌并交给一名角色，其选择弃置所有此花色牌或失去1点体力",
  ["ex__fanjian_show"] = "展示手牌，弃置你所有的%arg牌",

  ["$ex__fanjian1"] = "与我为敌，就当这般生不如死！",
  ["$ex__fanjian2"] = "抉择吧！在苦与痛的地狱中！",
}

local fanjian = fk.CreateSkill{
  name = "ex__fanjian",
}

fanjian:addEffect("active", {
  anim_type = "control",
  card_num = 1,
  target_num = 1,
  prompt = "#ex__fanjian",
  can_use = function(self, player)
    return player:usedSkillTimes(fanjian.name, Player.HistoryPhase) == 0
  end,
  card_filter = function(self, player, to_select, selected)
    return #selected == 0 and table.contains(player:getCardIds("h"), to_select)
  end,
  target_filter = function(self, player, to_select, selected)
    return #selected == 0 and to_select ~= player
  end,
  on_use = function(self, room, effect)
    local player = effect.from
    local target = effect.tos[1]
    local cid = effect.cards[1]
    player:showCards(cid)
    if player.dead then return end
    local suit = Fk:getCardById(cid).suit
    local suitString = Fk:getCardById(cid):getSuitString(true)
    room:obtainCard(target, cid, true, fk.ReasonGive, player, fanjian.name)
    if target.dead then return end
    local choices = { "ex__fanjian_show:::" .. suitString, "loseHp" }
    if target.hp <= 0 then
      table.remove(choices, 2)
    end
    if (target:isKongcheng() and table.every(target:getCardIds("e"), function (id)
      return Fk:getCardById(id).suit ~= suit
    end)) or suit == Card.NoSuit then
      table.remove(choices, 1)
    end
    if #choices == 0 then return end
    local choice = room:askToChoice(target, {
      choices = choices,
      skill_name = fanjian.name,
    })
    if choice == "loseHp" then
      room:loseHp(target, 1, fanjian.name)
    else
      local cards = target:getCardIds("h")
      target:showCards(cards)
      room:delay(500)
      if target.dead then return end
      local discards = table.filter(target:getCardIds("he"), function(id)
        return Fk:getCardById(id).suit == suit and not target:prohibitDiscard(id)
      end)
      if #discards > 0 then
        room:throwCard(discards, fanjian.name, target, target)
      end
    end
  end,
})

return fanjian
