local huoxin = fk.CreateSkill {
  name = "huoxin",
}

Fk:loadTranslationTable{
  ["huoxin"] = "惑心",
  [":huoxin"] = "出牌阶段限一次，你可以展示两张花色相同的手牌并分别交给两名其他角色，然后令这两名角色拼点，没赢的角色获得1个“魅惑”标记；"..
  "若双方拼点点数相差5或更多，改为获得2个“魅惑”标记。拥有2个或更多“魅惑”的角色回合即将开始时，该角色移去其所有“魅惑”，此回合改为由你操控。",

  ["@huoxin-meihuo"] = "魅惑",
  ["#huoxin"] = "惑心：将两张花色相同的手牌交给两名其他角色，令其拼点",
  ["#huoxin-give"] = "惑心：将这两张牌分配给这两名角色",

  ["$huoxin1"] = "今天下大乱，就不能摒弃儿女私情，挺身而出吗！",
  ["$huoxin2"] = "谁怜九州难救天下人，我有一心只付将军身……",
}

huoxin:addEffect("active", {
  anim_type = "control",
  prompt = "#huoxin",
  card_num = 2,
  target_num = 2,
  can_use = function(self, player)
    return player:usedSkillTimes(huoxin.name, Player.HistoryPhase) == 0
  end,
  card_filter = function(self, player, to_select, selected)
    if #selected < 2 and table.contains(player:getCardIds("h"), to_select) then
      if #selected == 0 then
        return Fk:getCardById(to_select).suit ~= Card.NoSuit
      else
        return Fk:getCardById(to_select):compareSuitWith(Fk:getCardById(selected[1]))
      end
    end
  end,
  target_filter = function(self, player, to_select, selected, selected_cards)
    if #selected_cards == 2 and #selected < 2 and to_select ~= player then
      if #selected == 0 then
        return true
      else
        return selected[1]:canPindian(to_select, true, true)
      end
    end
  end,
  on_use = function(self, room, effect)
    local player = effect.from
    local target1 = effect.tos[1]
    local target2 = effect.tos[2]
    room:askToYiji(player, {
      cards = effect.cards,
      targets = effect.tos,
      skill_name = huoxin.name,
      min_num = 2,
      max_num = 2,
      prompt = "#huoxin-give",
      single_max = 1,
      cancelable = false,
    })
    if not target1:canPindian(target2) then return end
    local pindianData = target1:pindian({ target2 }, huoxin.name)
    local winner = pindianData.results[target2].winner
    local fix = math.abs(pindianData.results[target2].toCard.number - pindianData.fromCard.number) >= 5 and 1 or 0
    if winner ~= target1 and not target1.dead then
      room:addPlayerMark(target1, "@huoxin-meihuo", 1 + fix)
    end
    if winner ~= target2 and not target2.dead then
      room:addPlayerMark(target2, "@huoxin-meihuo", 1 + fix)
    end
  end
})
huoxin:addEffect(fk.TurnStart, {
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(huoxin.name) and target:getMark("@huoxin-meihuo") >= 2
  end,
  on_cost = Util.TrueFunc,
  on_use = function(self, event, target, player, data)
    local room = player.room
    room:setPlayerMark(target, "@huoxin-meihuo", 0)
    room:setPlayerMark(target, "huoxincontrolled", player)
    player:control(target)
  end,
})
huoxin:addEffect(fk.TurnEnd, {
  can_refresh = function(self, event, target, player, data)
    return target == player and player:getMark("huoxincontrolled") ~= 0
  end,
  on_refresh = function(self, event, target, player, data)
    local controller = player:getMark("huoxincontrolled")
    player.room:setPlayerMark(player, "huoxincontrolled", 0)
    controller:uncontrol(player)
  end,
})

return huoxin
