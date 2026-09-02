local mouKeji = fk.CreateSkill({
  name = "mou__keji",
  dynamic_desc = function (self, player, lang)
    if player:usedSkillTimes("dujiang", Player.HistoryGame) > 0 then
      return "mou__keji_dyn"
    end
    return "mou__keji"
  end,
})

Fk:loadTranslationTable{
  ["mou__keji"] = "克己",
  [":mou__keji"] = "出牌阶段各限一次（若你已觉醒“渡江”，改为出牌阶段限一次），你可以选择一项：1.弃置一张手牌，获得1点护甲；" ..
  "2.失去1点体力，获得2点护甲（护甲值至多为5）。<br>"..
  "你的手牌上限+X（X为你的护甲值）。若你不处于濒死状态，你不能使用【桃】。",
  [":mou__keji_dyn"] = "出牌阶段限一次，你可以选择一项：1.弃置一张手牌，获得1点护甲；2.失去1点体力，获得2点护甲。<br>" ..
  "你的手牌上限+X（X为你的护甲值）。若你不处于濒死状态，你不能使用【桃】。",
  ["#mou__keji"] = "克己：你可以弃1手牌加1护甲，或失去1体力加2护甲",
  ["moukeji_choice1"] = "弃牌加1甲",
  ["moukeji_choice2"] = "掉血加2甲",
  ["#mou__keji_prohibit"] = "克己",

  ["$mou__keji1"] = "事事克己，步步虚心！",
  ["$mou__keji2"] = "勤学潜习，始觉自新！",
}

mouKeji:addEffect("active", {
  anim_type = "defensive",
  prompt = "#mou__keji",
  interaction = function(self, player)
    local all_choices = { "moukeji_choice1", "moukeji_choice2" }
    local choices = {}
    for _, c in ipairs(all_choices) do
      if player:getMark("mou__keji" .. c .. "-phase") == 0 then
        table.insert(choices, c)
      end
    end
    if #choices == 0 then return end
    return UI.ComboBox {choices = choices, all_choices = all_choices}
  end,
  can_use = function(self, player)
    return
      (not player:isKongcheng() or player.hp > 0) and
      player:usedSkillTimes(mouKeji.name, Player.HistoryPhase) < (player:usedSkillTimes("dujiang", Player.HistoryGame) == 0 and 2 or 1)
  end,
  card_num = function (self)
    local choice = self.interaction.data
    if choice == "moukeji_choice1" then
      return 1
    elseif choice == "moukeji_choice2" then
      return 0
    end
    return 999
  end,
  card_filter = function(self, player, to_select, selected)
    if self.interaction.data == "moukeji_choice1" then
      return #selected == 0 and Fk:currentRoom():getCardArea(to_select) ~= Player.Equip and not player:prohibitDiscard(to_select)
    end
    return false
  end,
  target_num = 0,
  on_use = function(self, room, effect)
    ---@type string
    local skillName = mouKeji.name
    local player = effect.from
    room:addPlayerMark(player, "mou__keji" .. self.interaction.data .. "-phase")
    if #effect.cards > 0 then
      room:throwCard(effect.cards, skillName, player, player)
      if player.dead then return end
      room:changeShield(player, 1)
    else
      room:loseHp(player, 1, skillName)
      if player.dead then return end
      room:changeShield(player, 2)
    end
  end,
})

mouKeji:addEffect("maxcards", {
  correct_func = function(self, player)
    return player:hasSkill(mouKeji.name) and player.shield or 0
  end,
})

mouKeji:addEffect("prohibit", {
  prohibit_use = function(self, player, card)
    return card and card.name == "peach" and player:hasSkill(mouKeji.name) and not player.dying
  end,
})

return mouKeji
