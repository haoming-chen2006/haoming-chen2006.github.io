local zongheng = fk.CreateSkill {
  name = "zongheng",
}

Fk:loadTranslationTable{
  ["zongheng"] = "纵横",
  [":zongheng"] = "准备阶段，你可以观看两名其他角色的手牌，你展示并获得其中一名角色的一张手牌，然后可以弃置另一名角色的手牌中与此牌"..
  "类别、花色、点数相同的牌各一张。",

  ["#zongheng-choose"] = "纵横：观看两名角色的手牌，获得其中一张，然后弃置另一名角色类别、花色、点数相同的手牌各一张",
  ["#zongheng-prey"] = "纵横：获得其中一张牌",
  ["#zongheng-discard"] = "纵横：你可以弃置其中 %arg 牌各一张",

  ["zongheng_prey"] = "纵横",
  ["zongheng_discard"] = "纵横",
}

local function zonghengJudge(id, info)
  local card, ret = Fk:getCardById(id), {}
  local info2 = {card.type, card.suit, card.number}
  for i = 1, 3 do
    if info[i] == info2[i] then
      table.insert(ret, i)
    end
  end
  return ret
end

Fk:addPoxiMethod{
  name = "zongheng_discard",
  prompt = function (data, extra_data)
    return "#zongheng-discard:::"..extra_data[4]
  end,
  card_filter = function (to_select, selected, data, extra_data)
    if #selected >= 3 then return false end
    local info = table.slice(extra_data, 1, 4)
    local all_infos = zonghengJudge(to_select, info)
    if #all_infos > 0 then
      for _, id in ipairs(selected) do
        for _, i in ipairs(zonghengJudge(id, info)) do
          table.insertIfNeed(all_infos, i)
        end
      end
      return #all_infos > #selected
    end
  end,
  feasible = Util.TrueFunc,
}

zongheng:addEffect(fk.EventPhaseStart, {
  anim_type = "control",
  can_trigger = function(self, event, target, player, data)
    return player == target and player:hasSkill(zongheng.name) and player.phase == Player.Start and
      #table.filter(player.room:getOtherPlayers(player, false), function (p)
        return not p:isKongcheng()
      end) > 1
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local targets = table.filter(room:getOtherPlayers(player, false), function (p)
        return not p:isKongcheng()
      end)
    local tos = room:askToChoosePlayers(player, {
      targets = targets,
      min_num = 2,
      max_num = 2,
      prompt = "#zongheng-choose",
      skill_name = zongheng.name,
      cancelable = true,
    })
    if #tos > 0 then
      room:sortByAction(tos)
      event:setCostData(self, {tos = tos})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local tos = event:getCostData(self).tos ---@type ServerPlayer[]
    local id = room:askToChooseCard(player, {
      target = player,
      flag = { card_data = {
        { tos[1]:toLogString(), tos[1]:getCardIds("h") },
        { tos[2]:toLogString(), tos[2]:getCardIds("h") } }
      },
      skill_name = zongheng.name,
      prompt = "#zongheng-prey",
      cancelable = false,
    })
    local to = table.contains(tos[1]:getCardIds("h"), id) and tos[2] or tos[1]
    local card = Fk:getCardById(id)
    local info = {card.type, card.suit, card.number, Fk:translate(card:getTypeString()) .. "、" .. Fk:translate(card:getSuitString()) .. "、".. Fk:translate("number") .. card:getNumberStr()} -- FIXME: 不能使用toLogString
    room:moveCardTo(id, Card.PlayerHand, player, fk.ReasonPrey, zongheng.name, nil, true, player)
    if player.dead or not table.contains(player:getCardIds("h"), id) then return end
    room:showCards(id)
    if player.dead or to.dead or to:isKongcheng() then return end
    local result = room:askToPoxi(player, {
      poxi_type = "zongheng_discard",
      data = {
        { to:toLogString(), to:getCardIds("h") },
      },
      extra_data = info
    })
    if #result > 0 then
      room:throwCard(result, zongheng.name, to, player)
    end
  end,
})

return zongheng
