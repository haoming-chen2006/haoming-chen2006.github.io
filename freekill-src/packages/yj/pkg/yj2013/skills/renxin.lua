local renxin = fk.CreateSkill {
  name = "renxin",
}

Fk:loadTranslationTable{
  ["renxin"] = "仁心",
  [":renxin"] = "当体力值为1的其他角色受到伤害时，你可以弃置一张装备牌，将武将牌翻面并防止此伤害。",

  ["#renxin-invoke"] = "仁心：你可以弃置一张装备牌并翻面，防止 %dest 受到的致命伤害",

  ["$renxin1"] = "仁者爱人，人恒爱之。",
  ["$renxin2"] = "有我在，别怕。",
}

renxin:addEffect(fk.DetermineDamageInflicted, {
  anim_type = "support",
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(renxin.name) and target ~= player and
      target.hp == 1 and not player:isNude()
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local card = room:askToDiscard(player, {
      min_num = 1,
      max_num = 1,
      include_equip = true,
      skill_name = renxin.name,
      cancelable = true,
      pattern = ".|.|.|.|.|equip",
      prompt = "#renxin-invoke::" .. target.id,
      skip = true,
    })
    if #card > 0 then
      event:setCostData(self, {tos = {target}, cards = card})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    data:preventDamage()
    player.room:throwCard(event:getCostData(self).cards, renxin.name, player, player)
    if not player.dead then
      player:turnOver()
    end
  end,
})

return renxin
