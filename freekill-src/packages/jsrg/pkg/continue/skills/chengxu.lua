local chengxu = fk.CreateSkill {
  name = "chengxu",
  tags = { Skill.AttachedKingdom, Skill.Compulsory },
  attached_kingdom = {"shu"},
}

Fk:loadTranslationTable{
  ["chengxu"] = "乘虚",
  [":chengxu"] = "蜀势力技，锁定技，势力与你相同的其他角色不能响应你使用的牌。",
}

chengxu:addEffect(fk.CardUsing, {
  anim_type = "offensive",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(chengxu.name) and
      data.card.type ~= Card.TypeEquip and
      table.find(player.room:getOtherPlayers(player, false), function(p)
        return p.kingdom == player.kingdom
      end)
  end,
  on_use = function(self, event, target, player, data)
    data.disresponsiveList = data.disresponsiveList or {}
    for _, p in ipairs(player.room:getOtherPlayers(player, false)) do
      if p.kingdom == player.kingdom then
        table.insertIfNeed(data.disresponsiveList, p)
      end
    end
  end,
})

return chengxu

