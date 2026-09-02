local liexian = fk.CreateSkill{
  name = "liexian",
}

Fk:loadTranslationTable{
  ["liexian"] = "烈弦",
  [":liexian"] = "当你回复体力后，你可以令一名其他角色失去1点体力并随机使用牌堆一张装备牌。",

  ["#liexian-choose"] = "烈弦：你可以令一名角色失去1点体力并使用随机装备",

  ["$liexian"] = "一壶烈云烧，一曲人皆醉。",
}

liexian:addEffect(fk.HpRecover, {
  anim_type = "offensive",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(liexian.name) and
      #player.room:getOtherPlayers(player, false) > 0
  end,
  on_cost = function (self, event, target, player, data)
    local room = player.room
    local to = room:askToChoosePlayers(player, {
      min_num = 1,
      max_num = 1,
      targets = room:getOtherPlayers(player, false),
      skill_name = liexian.name,
      prompt = "#liexian-choose",
      cancelable = true,
    })
    if #to > 0 then
      event:setCostData(self, {tos = to})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local to = event:getCostData(self).tos[1]
    room:loseHp(to, 1, liexian.name)
    if to.dead then return end
    local cards = table.filter(room.draw_pile, function (id)
      local card = Fk:getCardById(id)
      return card.type == Card.TypeEquip and to:canUseTo(card, to)
    end)
    if #cards > 0 then
      room:useCard{
        from = to,
        tos = {to},
        card = Fk:getCardById(room:tableRandomPick(cards)),
      }
    end
  end,
})

return liexian
