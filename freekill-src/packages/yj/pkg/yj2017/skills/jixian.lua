local jixian = fk.CreateSkill{
  name = "jixiann",
}

Fk:loadTranslationTable{
  ["jixiann"] = "激弦",
  [":jixiann"] = "当你受到伤害后，你可以令伤害来源失去1点体力并随机使用牌堆一张装备牌。",

  ["#jixiann-invoke"] = "激弦：你可以令 %dest 失去1点体力并使用随机装备",

  ["$jixiann"] = "一弹一拨，铿锵有力！",
}

jixian:addEffect(fk.Damaged, {
  anim_type = "masochism",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(jixian.name) and
      data.from and not data.from.dead
  end,
  on_cost = function (self, event, target, player, data)
    local room = player.room
    if room:askToSkillInvoke(player, {
      skill_name = jixian.name,
      prompt = "#jixiann-invoke::"..data.from.id,
    }) then
      event:setCostData(self, {tos = {data.from}})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    room:loseHp(data.from, 1, jixian.name)
    if data.from.dead then return end
    local cards = table.filter(room.draw_pile, function (id)
      local card = Fk:getCardById(id)
      return card.type == Card.TypeEquip and data.from:canUseTo(card, data.from)
    end)
    if #cards > 0 then
      room:useCard{
        from = data.from,
        tos = {data.from},
        card = Fk:getCardById(room:tableRandomPick(cards)),
      }
    end
  end,
})

return jixian
