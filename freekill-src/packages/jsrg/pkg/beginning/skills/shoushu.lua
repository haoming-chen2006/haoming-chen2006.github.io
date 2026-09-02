local shoushu = fk.CreateSkill {
  name = "shoushu",
  tags = { Skill.Compulsory },
}

Fk:loadTranslationTable{
  ["shoushu"] = "授术",
  [":shoushu"] = "锁定技，每轮开始时，若场上没有【太平要术】，你将之置入一名角色的装备区；当【太平要术】离开装备区时，销毁之。",

  ["#shoushu-choose"] = "授术：将【太平要术】置入一名角色的装备区",
}

shoushu:addEffect(fk.RoundStart, {
  anim_type = "support",
  can_trigger = function(self, event, target, player, data)
    local room = player.room
    return player:hasSkill(shoushu.name) and
      room:getCardArea(room:prepareDeriveCards({{"js__peace_spell", Card.Heart, 3}}, "shoushu_spell")[1]) == Card.Void and
      table.find(room.alive_players, function(p)
        return p:hasEmptyEquipSlot(Card.SubtypeArmor)
      end)
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local targets = table.filter(room.alive_players, function(p)
      return p:hasEmptyEquipSlot(Card.SubtypeArmor)
    end)
    local to = room:askToChoosePlayers(player, {
      targets = targets,
      min_num = 1,
      max_num = 1,
      prompt = "#shoushu-choose",
      skill_name = shoushu.name,
      cancelable = false,
    })[1]
    local card = room:prepareDeriveCards({{"js__peace_spell", Card.Heart, 3}}, "shoushu_spell")[1]
    room:setCardMark(Fk:getCardById(card), MarkEnum.DestructOutEquip, 1)
    room:moveCardIntoEquip(to, card, shoushu.name, true, player)
  end,
})

return shoushu
