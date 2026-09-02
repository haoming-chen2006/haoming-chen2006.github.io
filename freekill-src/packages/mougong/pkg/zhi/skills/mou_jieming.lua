local mouJieming = fk.CreateSkill({
  name = "mou__jieming",
})

Fk:loadTranslationTable{
  ["mou__jieming"] = "节命",
  [":mou__jieming"] = "当你受到伤害后，你可以令一名角色摸四张牌，然后其可弃置至少一张牌，若其弃置的牌数小于X" ..
  "（X为你已损失的体力值且至少为1），则你失去1点体力。",
  ["#mou__jieming"] = "节命：你可令一名角色摸牌且其可弃牌，弃牌不满足数量你失去体力",
  ["#mou__jieming-discard"] = "节命：你可弃置至少一张牌，若弃置牌数小于%arg，则 %src 失去1点体力",

  ["$mou__jieming1"] = "守誓心之节，达百里之命。",
  ["$mou__jieming2"] = "成佐王定策之功，守殉国忘身之节。",
}

mouJieming:addEffect(fk.Damaged, {
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local tos = room:askToChoosePlayers(
      player,
      {
        targets = room:getAlivePlayers(false),
        min_num = 1,
        max_num = 1,
        prompt = "#mou__jieming",
        skill_name = mouJieming.name
      }
    )
    if #tos > 0 then
      event:setCostData(self, tos[1])
      return true
    end

    return false
  end,
  on_use = function(self, event, target, player, data)
    ---@type string
    local skillName = mouJieming.name
    local room = player.room
    local to = event:getCostData(self)
    to:drawCards(4, skillName)
    local minDiscard = math.max(1, player:getLostHp())
    local toDiscard = room:askToDiscard(
      to,
      {
        min_num = 1,
        max_num = #to:getCardIds("he"),
        include_equip = true,
        skill_name = skillName,
        prompt = "#mou__jieming-discard:" .. player.id .. "::" .. minDiscard
      }
    )

    if #toDiscard < minDiscard then
      room:loseHp(player, 1, skillName)
    end
  end,
})

return mouJieming
