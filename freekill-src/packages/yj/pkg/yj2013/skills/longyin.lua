local longyin = fk.CreateSkill {
  name = "longyin",
}

Fk:loadTranslationTable{
  ["longyin"] = "龙吟",
  [":longyin"] = "当一名角色于其出牌阶段使用【杀】时，你可以弃置一张牌令此【杀】不计入出牌阶段使用次数，若此【杀】为红色，你摸一张牌。",

  ["#longyin-invoke"] = "龙吟：你可以弃置一张牌令 %dest 的【杀】不计入次数限制",

  ["$longyin1"] = "破阵杀敌，愿献犬马之劳！",
  ["$longyin2"] = "虎啸既响，龙吟当附！",
}

longyin:addEffect(fk.CardUsing, {
  anim_type = "support",
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(longyin.name) and target.phase == Player.Play and
      data.card.trueName == "slash" and not player:isNude()
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local card = room:askToDiscard(player, {
      min_num = 1,
      max_num = 1,
      include_equip = true,
      skill_name = longyin.name,
      cancelable = true,
      prompt = "#longyin-invoke::" .. target.id,
      skip = true,
    })
    if #card > 0 then
      event:setCostData(self, {tos = {target}, cards = card})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    player.room:throwCard(event:getCostData(self).cards, longyin.name, player, player)
    if not data.extraUse then
      target:addCardUseHistory(data.card.trueName, -1)
      data.extraUse = true
    end
    if data.card.color == Card.Red and not player.dead then
      player:drawCards(1, longyin.name)
    end
  end,
})

return longyin
