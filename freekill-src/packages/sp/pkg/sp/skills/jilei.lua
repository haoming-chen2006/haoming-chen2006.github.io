local jilei = fk.CreateSkill {
  name = "jilei",
}

Fk:loadTranslationTable{
  ["jilei"] = "鸡肋",
  [":jilei"] = "当你受到伤害后，你可以声明一种牌的类别（基本牌、锦囊牌、装备牌），伤害来源不能使用、打出或弃置该类别的手牌直到回合结束。",

  ["#jilei-invoke"] = "鸡肋：声明一种牌的类别，%dest 本回合不能使用、打出、弃置该类别的手牌",
  ["@jilei-turn"] = "鸡肋",

  ["$jilei1"] = "食之无肉，弃之有味。",
  ["$jilei2"] = "曹公之意我已了然！",
}

jilei:addEffect(fk.Damaged, {
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(jilei.name) and data.from and not data.from.dead
  end,
  on_cost = function (self, event, target, player, data)
    local room = player.room
    local choice = room:askToChoice(player, {
      choices = {"basic", "trick", "equip", "Cancel"},
      skill_name = jilei.name,
      prompt = "#jilei-invoke::"..data.from.id,
    })
    if choice ~= "Cancel" then
      event:setCostData(self, {tos = {data.from}, choice = choice})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local choice = event:getCostData(self).choice
    room:addTableMarkIfNeed(data.from, "@jilei-turn", choice.."_char")
  end,
})

jilei:addEffect("prohibit", {
  prohibit_use = function(self, player, card)
    if table.contains(player:getTableMark("@jilei-turn"), card:getTypeString() .. "_char") then
      local subcards = card:isVirtual() and card.subcards or {card.id}
      return #subcards > 0 and
        table.every(subcards, function(id)
          return table.contains(player:getCardIds("h"), id)
        end)
    end
  end,
  prohibit_response = function(self, player, card)
    if table.contains(player:getTableMark("@jilei-turn"), card:getTypeString() .. "_char") then
      local subcards = card:isVirtual() and card.subcards or {card.id}
      return #subcards > 0 and
        table.every(subcards, function(id)
          return table.contains(player:getCardIds("h"), id)
        end)
    end
  end,
  prohibit_discard = function(self, player, card)
    return table.contains(player:getTableMark("@jilei-turn"), card:getTypeString() .. "_char")
  end,
})

return jilei
