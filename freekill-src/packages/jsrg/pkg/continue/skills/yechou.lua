local yechou = fk.CreateSkill {
  name = "js__yechou",
}

Fk:loadTranslationTable{
  ["js__yechou"] = "业仇",
  [":js__yechou"] = "当你死亡时，你可以选择一名其他角色，本局游戏当其受到致命伤害时，此伤害翻倍。",

  ["#js__yechou-choose"] = "业仇：你可以令一名角色本局游戏受到致命伤害时加倍！",
  ["@@js__yechou"] = "业仇",
}

yechou:addEffect(fk.Death, {
  anim_type = "offensive",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(yechou.name, false, true)
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local to = room:askToChoosePlayers(player, {
      targets = room:getOtherPlayers(player, false),
      min_num = 1,
      max_num = 1,
      prompt = "#js__yechou-choose",
      skill_name = yechou.name,
      cancelable = true,
    })
    if #to > 0 then
      event:setCostData(self, {tos = to})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local to = event:getCostData(self).tos[1]
    player.room:addPlayerMark(to, "@@js__yechou", 1)
  end,
})

yechou:addEffect(fk.DamageInflicted, {
  anim_type = "negative",
  is_delay_effect = true,
  can_trigger = function(self, event, target, player, data)
    return target == player and player:getMark("@@js__yechou") > 0 and data.damage >= (player.hp + player.shield)
  end,
  on_use = function(self, event, target, player, data)
    data:changeDamage(data.damage * (2 ^ player:getMark("@@js__yechou") - 1))
  end,
})

return yechou
