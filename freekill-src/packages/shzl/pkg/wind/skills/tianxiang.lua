local tianxiang = fk.CreateSkill({
  name = "tianxiang",
})

Fk:loadTranslationTable{
  ["tianxiang"] = "天香",
  [":tianxiang"] = "当你受到伤害时，你可以弃置一张<font color='red'>♥</font>手牌并选择一名其他角色。若如此做，你将此伤害转移给该角色，"..
  "然后其摸X张牌（X为其已损失体力值）。",

  ["#tianxiang-choose" ] = "天香：弃置一张<font color='red'>♥</font>手牌将伤害转移给一名角色，其摸已损失体力值张牌",

  ["$tianxiang2"] = "接着哦~",
  ["$tianxiang1"] = "替我挡着~",
}

tianxiang:addEffect(fk.DetermineDamageInflicted, {
  anim_type = "defensive",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(tianxiang.name) and not player:isKongcheng()
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local tos, cards = room:askToChooseCardsAndPlayers(player, {
      min_card_num = 1,
      max_card_num = 1,
      min_num = 1,
      max_num = 1,
      targets = room:getOtherPlayers(player, false),
      pattern = ".|.|heart|hand",
      skill_name = tianxiang.name,
      prompt = "#tianxiang-choose",
      cancelable = true,
      will_throw = true,
    })
    if #tos > 0 and #cards == 1 then
      event:setCostData(self, {tos = tos, cards = cards})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local n = data.damage
    data:preventDamage()
    local to = event:getCostData(self).tos[1]
    room:throwCard(event:getCostData(self).cards, tianxiang.name, player, player)
    if not to.dead then
      room:damage{
        from = data.from,
        to = to,
        damage = n,
        damageType = data.damageType,
        skillName = data.skillName,
        chain = data.chain,
        card = data.card,
      }
    end
    if not to.dead then
      to:drawCards(to:getLostHp(), tianxiang.name)
    end
  end,
})

return tianxiang
