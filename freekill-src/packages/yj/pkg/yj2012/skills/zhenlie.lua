local zhenlie = fk.CreateSkill {
  name = "zhenlie",
}

Fk:loadTranslationTable{
  ["zhenlie"] = "贞烈",
  [":zhenlie"] = "当你成为其他角色使用【杀】或普通锦囊牌的目标后，你可以失去1点体力使此牌对你无效，然后你弃置其一张牌。",

  ["#zhenlie-invoke"] = "贞烈：是否失去1点体力，令 %dest 使用的%arg对你无效？",

  ["$zhenlie1"] = "虽是妇人，亦当奋身一搏！",
  ["$zhenlie2"] = "为雪前耻，不惜吾身！",
}

zhenlie:addEffect(fk.TargetConfirmed, {
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(zhenlie.name) and data.from ~= player and
      (data.card.trueName == "slash" or data.card:isCommonTrick())
  end,
  on_cost = function (self, event, target, player, data)
    local room = player.room
    if room:askToSkillInvoke(player, {
      skill_name = zhenlie.name,
      prompt = "#zhenlie-invoke::"..data.from.id..":"..data.card:toLogString(),
    }) then
      event:setCostData(self, {tos = {data.from}})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    room:loseHp(player, 1, zhenlie.name)
    if player.dead then return end
    data.use.nullifiedTargets = data.use.nullifiedTargets or {}
    table.insertIfNeed(data.use.nullifiedTargets, player)
    if data.from.dead or data.from:isNude() then return end
    local id = room:askToChooseCard(player, {
      target = data.from,
      flag = "he",
      skill_name = zhenlie.name,
    })
    room:throwCard(id, zhenlie.name, data.from, player)
  end,
})

return zhenlie
