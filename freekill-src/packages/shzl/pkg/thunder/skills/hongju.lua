local hongju = fk.CreateSkill {
  name = "hongju",
  tags = {Skill.Wake},
  related_skills = { "qingce" },
}

Fk:loadTranslationTable{
  ["hongju"] = "鸿举",
  [":hongju"] = "觉醒技，准备阶段，若“荣”的数量不小于3且场上有角色死亡，你可以用任意张手牌替换等量的“荣”，减1点体力上限，获得〖清侧〗。",

  ["#hongju-exchange"] = "鸿举：你可以用手牌交换“荣”",

  ["$hongju1"] = "一举拿下，鸿途可得。",
  ["$hongju2"] = "鸿飞荣升，举重若轻。",
}

hongju:addEffect(fk.EventPhaseStart, {
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(hongju.name) and
      player.phase == Player.Start and
      player:usedSkillTimes(hongju.name, Player.HistoryGame) == 0
  end,
  can_wake = function(self, event, target, player, data)
    return #player:getPile("$guanqiujian__glory") > 2 and
      table.find(player.room.players, function(p)
        return p.dead
      end)
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    if not player:isKongcheng() then
      local piles = room:askToArrangeCards(player, {
        skill_name = hongju.name,
        card_map = {
          player:getPile("$guanqiujian__glory"), player:getCardIds("h"),
          "$guanqiujian__glory", "$Hand"
        },
        prompt = "#hongju-exchange",
      })
      room:swapCardsWithPile(player, piles[1], piles[2], hongju.name, "$guanqiujian__glory", true)
      if player.dead then return end
    end
    room:changeMaxHp(player, -1)
    if player.dead then return end
    room:handleAddLoseSkills(player, "qingce", nil, true, false)
  end,
})

return hongju
