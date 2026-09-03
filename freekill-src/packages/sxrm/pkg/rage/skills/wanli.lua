
local wanli = fk.CreateSkill{
  name = "wanli",
}

Fk:loadTranslationTable{
  ["wanli"] = "万利",
  [":wanli"] = "首轮开始时，你可以交给一名其他角色任意张牌，第四轮结束时若你存活，其交给你三倍数量的牌（不足则全给并失去所有技能）；"..
  "若其已还牌或死亡，你摸牌阶段多摸三张牌。",

  ["#wanli-invoke"] = "万利：交给一名其他角色任意张牌，第四轮结束时其需交给你三倍的牌！",
  ["#wanli-give"] = "万利：请交给 %src %arg张牌",
}

wanli:addEffect(fk.RoundStart, {
  anim_type = "support",
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(wanli.name) and player.room:getBanner("RoundCount") == 1 and
      not player:isNude() and #player.room:getOtherPlayers(player, false) > 0
  end,
  on_cost = function (self, event, target, player, data)
    local room = player.room
    local to, cards = room:askToChooseCardsAndPlayers(player, {
      min_card_num = 1,
      max_card_num = 999,
      min_num = 1,
      max_num = 1,
      targets = room:getOtherPlayers(player, false),
      skill_name = wanli.name,
      prompt = "#wanli-invoke",
      cancelable = true,
    })
    if #to > 0 and #cards > 0 then
      event:setCostData(self, { tos = to, cards = cards })
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local to = event:getCostData(self).tos[1]
    local cards = event:getCostData(self).cards or {}
    room:setPlayerMark(player, wanli.name, { to, #cards, 4 })
    room:moveCardTo(cards, Card.PlayerHand, to, fk.ReasonGive, wanli.name, nil, false, player)
  end,
})

wanli:addEffect(fk.RoundEnd, {
  anim_type = "control",
  can_trigger = function (self, event, target, player, data)
    return player:hasSkill(wanli.name) and player:getMark(wanli.name) ~= 0 and
      not player:getMark(wanli.name)[1].dead and player.room:getBanner("RoundCount") == player:getMark(wanli.name)[3]
  end,
  on_cost = function (self, event, target, player, data)
    event:setCostData(self, { tos = { player:getMark(wanli.name)[1] } })
    return true
  end,
  on_use = function (self, event, target, player, data)
    local room = player.room
    room:setPlayerMark(player, "wanli_wake", 1)
    local to = player:getMark(wanli.name)[1]
    local n = 3 * player:getMark(wanli.name)[2]
    local cards = room:askToCards(to, {
      min_num = n,
      max_num = n,
      include_equip = true,
      prompt = "#wanli-give:"..player.id.."::"..n,
      skill_name = wanli.name,
      cancelable = false,
    })
    if #cards > 0 then
      room:moveCardTo(cards, Card.PlayerHand, player, fk.ReasonGive, wanli.name, nil, false, to)
    end
    if #cards < n then
      room:handleAddLoseSkills(to, "-"..table.concat(to:getSkillNameList(), "|-"))
    end
  end,
})

wanli:addEffect(fk.DrawNCards, {
  anim_type = "drawcard",
  can_trigger = function(self, event, target, player, data)
    if target == player and player:hasSkill(wanli.name) then
      if player:getMark("wanli_wake") > 0 then
        return true
      else
        return player:getMark(wanli.name) ~= 0 and player:getMark(wanli.name)[1].dead
      end
    end
  end,
  on_cost = Util.TrueFunc,
  on_use = function (self, event, target, player, data)
    data.n = data.n + 3
  end,
})

return wanli
