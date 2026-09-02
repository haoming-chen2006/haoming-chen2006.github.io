local mouFanjian = fk.CreateSkill({
  name = "mou__fanjian",
})

Fk:loadTranslationTable{
  ["mou__fanjian"] = "反间",
  [":mou__fanjian"] = "出牌阶段，你可以选择一名其他角色和一张牌（每种花色每回合限一次）并声明一个花色，其须选择一项：1.猜测此牌花色是否与你声明的" ..
  "花色相同；2.翻面且本技能于本回合内失效。然后其正面向上获得此牌。若其选择猜测且猜测：正确，本技能于本回合内失效；错误，其失去1点体力。",
  ["mou__fanjian_true"] = "花色相同",
  ["mou__fanjian_false"] = "花色不相同",
  ["mou__fanjian_fanmian"] = "你翻面",

  ["#mou__fanjian-active"] = "反间:请猜测选择的牌花色是否与%arg 相同或者选择翻面。",
  ["#fanjian_log"] = "%from 发动了“%arg2”，声明的花色为 【%arg】。",
  ["@moufanjianRecord-turn"] = "反间",

  ["$mou__fanjian1"] = "若不念汝三世之功，今日定斩不赦！",
  ["$mou__fanjian2"] = "比之自内，不自失也！",
}

mouFanjian:addEffect("active", {
  anim_type = "control",
  interaction = function(self)
    local choiceList = { "spade", "heart", "club", "diamond" }
    return UI.ComboBox { choices = choiceList }
  end,
  card_num = 1,
  target_num = 1,
  can_use = function(self, player)
    return true
  end,
  card_filter = function(self, player, to_select, selected)
    if #selected == 1 then return false end
    if player:getMark("moufanjianRecord-turn") ~= 0 then
      local suitsx = player:getMark("moufanjianRecord-turn")
      suitsx = suitsx:split("+")
      return not table.contains(suitsx, Fk:getCardById(to_select):getSuitString())
    else return true end
  end,
  target_filter = function(self, player, to_select, selected)
    return #selected == 0
  end,
  on_use = function(self, room, effect)
    ---@type string
    local skillName = mouFanjian.name
    local player = effect.from
    local target = effect.tos[1]
    room:sendLog {
      type = "#fanjian_log",
      from = player.id,
      arg = self.interaction.data,
      arg2 = skillName
    }
    local choiceList = { "mou__fanjian_true", "mou__fanjian_false", "mou__fanjian_fanmian" }
    local choice = room:askToChoice(
      target,
      {
        choices = choiceList,
        skill_name = skillName,
        prompt = "#mou__fanjian-active:::" .. self.interaction.data
      }
    )
    if choice == "mou__fanjian_fanmian" then
      target:turnOver()
      room:invalidateSkill(player, skillName, "-turn")
    elseif choice == "mou__fanjian_true" then
      if self.interaction.data == Fk:getCardById(effect.cards[1]):getSuitString() then
        room:invalidateSkill(player, skillName, "-turn")
      else
        room:loseHp(target, 1, skillName)
      end
    elseif choice == "mou__fanjian_false" then
      if self.interaction.data ~= Fk:getCardById(effect.cards[1]):getSuitString() then
        room:invalidateSkill(player, skillName, "-turn")
      else
        room:loseHp(target, 1, skillName)
      end
    end

    if target:isAlive() then
      room:obtainCard(target, effect.cards[1], false, fk.ReasonGive)
    end
    local suit = Fk:getCardById(effect.cards[1]):getSuitString()
    if table.contains({ "spade", "heart", "club", "diamond" }, suit) then
      local m = player:getMark("moufanjianRecord-turn")
      if m == 0 then
        m = suit
      elseif type(m) == "string" then
        local suits = m:split("+")
        table.insertIfNeed(suits, suit)
        m = table.concat(suits, "+")
      end
      room:setPlayerMark(player, "moufanjianRecord-turn", m)
      local card_suits_table = {
        spade = "♠",
        club = "♣",
        heart = "♥",
        diamond = "♦",
      }
      room:setPlayerMark(player, "@moufanjianRecord-turn", table.concat(
        table.map(m:split("+"), function(s) return card_suits_table[s] end)
      , ""))
    end
  end,
})


return mouFanjian
