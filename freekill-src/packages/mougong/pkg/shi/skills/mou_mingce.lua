local mouMingce = fk.CreateSkill({
  name = "mou__mingce",
})

Fk:loadTranslationTable{
  ["mou__mingce"] = "明策",
  [":mou__mingce"] = "①出牌阶段限一次，你可以交给一名其他角色一张牌，令其选择一项：1.失去1点体力，令你摸两张牌并获得1个“策”标记；2.摸一张牌。<br>"..
  "②出牌阶段开始时，若你拥有“策”标记，你可以选择一名其他角色，对其造成X点伤害并移去所有“策”标记（X为你的“策”标记数）。",
  ["#mou__mingce"] = "明策：交给一名角色一张牌，其选择失去体力令你摸牌，或其摸一张牌",
  ["mou__mingce_losehp"] = "你失去1点体力，令%src摸两张牌并获得“策”标记",
  ["#mou__mingce-choose"] = "明策：移去所有“策”标记，对一名其他角色造成 %arg 点伤害",
  ["@mou__mingce"] = "策",
  ["#mou__mingce_trigger"] = "明策",

  ["$mou__mingce1"] = "行吾此计，可使将军化险为夷。",
  ["$mou__mingce2"] = "分兵驻扎，可互为掎角之势。",
}

mouMingce:addEffect("active", {
  anim_type = "support",
  card_num = 1,
  target_num = 1,
  prompt = "#mou__mingce",
  can_use = function(self, player)
    return player:usedEffectTimes(self.name, Player.HistoryPhase) == 0 and not player:isNude()
  end,
  card_filter = function(self, player, to_select, selected)
    return #selected == 0
  end,
  target_filter = function(self, player, to_select, selected)
    return #selected == 0 and to_select ~= player
  end,
  on_use = function(self, room, effect)
    local player = effect.from
    local target = effect.tos[1]
    room:obtainCard(target, effect.cards[1], false, fk.ReasonGive)
    if player.dead or target.dead then return end

    local skillName = mouMingce.name
    if room:askToChoice(target, { choices = {"mou__mingce_losehp:" .. player.id, "draw1"}, skill_name = skillName }) == "draw1" then
      target:drawCards(1, skillName)
    else
      room:loseHp(target, 1, skillName)
      if not player.dead then
        player:drawCards(2, skillName)
        room:addPlayerMark(player, "@mou__mingce")
      end
    end
  end,
})

mouMingce:addEffect(fk.EventPhaseStart, {
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(mouMingce.name) and player.phase == Player.Play and player:getMark("@mou__mingce") > 0
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local tos = room:askToChoosePlayers(
      player,
      {
        targets = room:getOtherPlayers(player, false),
        min_num = 1,
        max_num = 1,
        prompt = "#mou__mingce-choose:::" .. player:getMark("@mou__mingce"),
        skill_name = mouMingce.name,
        cancelable = true
      }
    )

    if #tos > 0 then
      event:setCostData(self, tos[1])
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local skillName = mouMingce.name
    player:broadcastSkillInvoke(skillName)
    local to = event:getCostData(self)
    room:damage { from = player, to = to, damage = player:getMark("@mou__mingce"), skillName = skillName }
    room:setPlayerMark(player, "@mou__mingce", 0)
  end,
})

return mouMingce
