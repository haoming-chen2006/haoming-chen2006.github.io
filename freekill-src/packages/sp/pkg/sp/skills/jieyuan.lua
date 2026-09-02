local jieyuan = fk.CreateSkill {
  name = "jieyuan",
}

Fk:loadTranslationTable {
  ["jieyuan"] = "竭缘",
  [":jieyuan"] = "当你对其他角色造成伤害时，若其体力值不小于你，你可以弃置一张黑色手牌令此伤害+1；当你受到其他角色造成的伤害时，"..
  "若其体力值不小于你，你可以弃置一张红色手牌令此伤害-1。",

  ["#jieyuan1-invoke"] = "竭缘：你可以弃置一张黑色手牌令对 %dest 造成的伤害+1",
  ["#jieyuan2-invoke"] = "竭缘：你可以弃置一张红色手牌令此伤害-1",

  ["$jieyuan1"] = "我所有的努力，都是为了杀你！",
  ["$jieyuan2"] = "我必须活下去！",
}

jieyuan:addEffect(fk.DamageCaused, {
  mute = true,
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(jieyuan.name) and not player:isKongcheng() and
      data.to.hp >= player.hp
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local card = room:askToDiscard(player, {
      skill_name = jieyuan.name,
      min_num = 1,
      max_num = 1,
      include_equip = false,
      cancelable = true,
      pattern = ".|.|spade,club",
      prompt = "#jieyuan1-invoke::" .. data.to.id,
      skip = true,
    })
    if #card > 0 then
      event:setCostData(self, {tos = {data.to}, cards = card})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    player:broadcastSkillInvoke(jieyuan.name, 1)
    room:notifySkillInvoked(player, jieyuan.name, "offensive")
    room:throwCard(event:getCostData(self).cards, jieyuan.name, player, player)
    data:changeDamage(1)
  end,
})

jieyuan:addEffect(fk.DamageInflicted, {
  mute = true,
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(jieyuan.name) and not player:isKongcheng() and
      data.from and data.from.hp >= player.hp
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local card = room:askToDiscard(player, {
      skill_name = jieyuan.name,
      min_num = 1,
      max_num = 1,
      include_equip = false,
      cancelable = true,
      pattern = ".|.|heart,diamond",
      prompt = "#jieyuan2-invoke",
      skip = true,
    })
    if #card > 0 then
      event:setCostData(self, {cards = card})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    player:broadcastSkillInvoke(jieyuan.name, 2)
    room:notifySkillInvoked(player, jieyuan.name, "defensive")
    room:throwCard(event:getCostData(self).cards, jieyuan.name, player, player)
    data:changeDamage(-1)
  end,
})

return jieyuan
