local dingce = fk.CreateSkill {
  name = "dingce",
}

Fk:loadTranslationTable{
  ["dingce"] = "定策",
  [":dingce"] = "当你受到伤害后，你可以依次弃置你和伤害来源各一张手牌，若这两张牌颜色相同，视为你使用一张【洞烛先机】。",

  ["#dingce-invoke"] = "定策：你可以弃置你和 %dest 各一张手牌，若颜色相同，视为你使用【洞烛先机】",
}

dingce:addEffect(fk.Damaged, {
  anim_type = "masochism",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(dingce.name) and
      not player:isKongcheng() and data.from and not data.from.dead
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local card = room:askToDiscard(player, {
      min_num = 1,
      max_num = 1,
      include_equip = false,
      skill_name = dingce.name,
      prompt = "#dingce-invoke::"..data.from.id,
      cancelable = true,
      skip = true,
    })
    if #card > 0 then
      event:setCostData(self, {tos = {data.from}, cards = card})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local id1 = event:getCostData(self).cards[1]
    room:throwCard(id1, dingce.name, player, player)
    if player.dead or data.from.dead or data.from:isKongcheng() then return end
    local id2
    if data.from == player then
      local card = room:askToDiscard(player, {
        min_num = 1,
        max_num = 1,
        include_equip = false,
        skill_name = dingce.name,
        cancelable = false,
      })
      if #card > 0 then
        id2 = card[1]
      end
    else
      id2 = room:askToChooseCard(player, {
        target = data.from,
        flag = "h",
        skill_name = dingce.name,
      })
      room:throwCard(id2, dingce.name, data.from, player)
    end
    if player.dead or id2 == nil or Fk:getCardById(id1).color ~= Fk:getCardById(id2).color or
      Fk:getCardById(id1).color == Card.NoColor then return end
    room:useVirtualCard("foresight", nil, player, player, dingce.name)
  end,
})

return dingce
