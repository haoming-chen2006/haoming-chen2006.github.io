local mouGuose = fk.CreateSkill({
  name = "mou__guose",
})

Fk:loadTranslationTable{
  ["mou__guose"] = "国色",
  [":mou__guose"] = "出牌阶段限四次（若不为身份模式改为限两次），你可以选择一项：1.将一张<font color='red'>♦</font>牌当【乐不思蜀】使用；"..
  "2.弃置场上的一张【乐不思蜀】。选择完成后，你摸一张牌。",
  ["mou__guose_use"] = "使用乐不思蜀",
  ["mou__guose_throw"] = "弃置乐不思蜀",

  ["$mou__guose1"] = "还望将军，稍等片刻。",
  ["$mou__guose2"] = "将军，请留步。",
}

mouGuose:addEffect("active", {
  anim_type = "control",
  min_card_num = 0,
  max_card_num = 1,
  target_num = 1,
  times = function (self, player)
    if player.phase == Player.Play then
      local max_limit = Fk:currentRoom():isGameMode("role_mode") and 4 or 2
      return max_limit - player:usedSkillTimes(mouGuose.name, Player.HistoryPhase)
    end
    return -1
  end,
  can_use = function(self, player)
    local max_limit = Fk:currentRoom():isGameMode("role_mode") and 4 or 2
    return player:usedSkillTimes(mouGuose.name, Player.HistoryPhase) < max_limit
  end,
  interaction = function()
    return UI.ComboBox { choices = { "mou__guose_use" , "mou__guose_throw" } }
  end,
  card_filter = function(self, player, to_select, selected)
    if #selected > 0 or self.interaction.data ~= "mou__guose_use" then return false end
    local card = Fk:cloneCard("indulgence")
    card:addSubcard(to_select)
    return player:canUse(card) and not player:prohibitUse(card) and Fk:getCardById(to_select).suit == Card.Diamond
  end,
  target_filter = function(self, player, to_select, selected, cards)
    if #selected > 0 or not self.interaction.data then return false end
    if self.interaction.data == "mou__guose_use" then
      if #cards ~= 1 then return false end
      local card = Fk:cloneCard("indulgence")
      card:addSubcard(cards[1])
      return to_select ~= player and not player:isProhibited(to_select, card)
    else
      return to_select:hasDelayedTrick("indulgence")
    end
  end,
  on_use = function(self, room, effect)
    ---@type string
    local skillName = mouGuose.name
    local player = effect.from
    local target = effect.tos[1]
    if self.interaction.data == "mou__guose_use" then
      room:useVirtualCard("indulgence", effect.cards, player, target, skillName)
    else
      for _, id in ipairs(target.player_cards[Player.Judge]) do
        local card = target:getVirtualEquip(id)
        if not card then card = Fk:getCardById(id) end
        if card.name == "indulgence" then
          room:throwCard({ id }, skillName, target, player)
          break
        end
      end
    end
    if not player.dead then
      player:drawCards(1, skillName)
    end
  end,
})

return mouGuose
