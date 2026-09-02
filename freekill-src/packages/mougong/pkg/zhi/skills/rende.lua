
local rende = fk.CreateSkill({
  name = "mou__rende",
  tags = { Skill.Charge },
  max_branches_use_time = function(self, player)
    local ret = {
      use = {
        [Player.HistoryTurn] = 1,
      }
    }
    for _, to in ipairs(Fk:currentRoom().players) do
      ret[tostring(to.id)] = {
        [Player.HistoryPhase] = 1,
      }
    end
    return ret
  end,
})

Fk:loadTranslationTable{
  ["mou__rende"] = "仁德",
  [":mou__rende"] = "蓄力技（0/8），出牌阶段开始时，你获得2点蓄力点；"..
  "出牌阶段，你可以将任意张牌交给一名本阶段未因此获得过牌的其他角色，并获得等量蓄力点。"..
  "每回合限一次，你可以消耗2点蓄力点，视为使用或打出一张基本牌。",

  ["#mou__rende"] = "仁望：将任意张牌交给其他角色获得蓄力点，或消耗2点蓄力点视为使用基本牌",
  ["#mou__rende-give"] = "仁德：将任意张牌交给其他角色，获得等量蓄力点",
  ["#mou__rende-use"] = "仁德：消耗2点蓄力点，视为使用或打出基本牌",

  ["$mou__rende1"] = "仁德为政，自得民心！",
  ["$mou__rende2"] = "民心所望，乃吾政所向！",
}

local U = require "packages.utility.utility"

rende:addEffect("viewas", {
  pattern = ".|.|.|.|.|basic",
  prompt = function(self, player, selected_cards)
    if player.phase == Player.Play and Fk.currentResponsePattern == nil then
      if #selected_cards > 0 then
        return "#mou__rende-give"
      else
        return "#mou__rende"
      end
    else
      return "#mou__rende-use"
    end
  end,
  interaction = function(self, player)
    local choices = {}
    if player.phase == Player.Play and Fk.currentResponsePattern == nil then
      table.insert(choices,  "mou__rende")
    end
    if player:getMark("skill_charge") > 1 and
      rende:withinBranchTimesLimit(player, "use", Player.HistoryTurn) then
      local all_names = Fk:getAllCardNames("b")
      table.insertTable(choices, player:getViewAsCardNames(rende.name, all_names))
    end
    return UI.ComboBox { choices = choices }
  end,
  filter_pattern = {
    min_num = 0,
    max_num = 0,
    pattern = ".",
  },
  card_filter = function (self, player, to_select, selected)
    return self.interaction.data == "mou__rende"
  end,
  target_filter = function (self, player, to_select, selected, selected_cards, card, extra_data)
    if self.interaction.data == "mou__rende" then
      return #selected == 0 and to_select ~= player and
        rende:withinBranchTimesLimit(player, tostring(to_select.id), Player.HistoryPhase)
    else
      return false
    end
  end,
  feasible = function(self, player, selected, selected_cards)
    if self.interaction.data == "mou__rende" then
      return #selected == 1 and #selected_cards > 0
    else
      return #selected == 0 and #selected_cards == 0
    end
  end,
  on_use = function (self, room, effect, card, params)
    local player = effect.from
    if card then
      player:addSkillBranchUseHistory(rende.name, "use", 1)
      U.skillCharged(player, -2)
      return ViewAsSkill:onUse(room, effect, card, params)
    else
      local target = effect.tos[1]
      player:addSkillBranchUseHistory(rende.name, tostring(target.id), 1)
      room:addTableMarkIfNeed(player, rende.name, target)
      room:moveCardTo(effect.cards, Card.PlayerHand, target, fk.ReasonGive, rende.name, nil, false, player)
      if player.dead then return end
      U.skillCharged(player, #effect.cards)
    end
  end,
  view_as = function(self, player, cards)
    if self.interaction.data == "mou__rende" then
      return nil
    elseif self.interaction.data ~= nil then
      local card = Fk:cloneCard(self.interaction.data)
      card.skillName = rende.name
      return card
    end
  end,
  enabled_at_response = function (self, player, response)
    return player:getMark("skill_charge") > 1 and
      rende:withinBranchTimesLimit(player, "use", Player.HistoryTurn)
  end,
})

rende:addEffect(fk.EventPhaseStart, {
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(rende.name) and player.phase == Player.Play and
      player:getMark("skill_charge") < player:getMark("skill_charge_max")
  end,
  on_cost = Util.TrueFunc,
  on_use = function(self, event, target, player, data)
    U.skillCharged(player, 2)
  end,
})

rende:addAcquireEffect(function (self, player)
  U.skillCharged(player, 0, 8)
end)

rende:addLoseEffect(function (self, player)
  U.skillCharged(player, -0, -8)
end)

return rende
