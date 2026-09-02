local qingxix = fk.CreateSkill {
  name = "qingxix",
  tags = { Skill.AttachedKingdom },
  attached_kingdom = {"qun"},
}

Fk:loadTranslationTable{
  ["qingxix"] = "轻袭",
  [":qingxix"] = "群势力技，出牌阶段对每名角色限一次，你可以选择一名手牌数小于你的角色，你将手牌弃至与其相同，然后视为对其使用一张"..
  "无距离和次数限制的刺【杀】。",

  ["#qingxix"] = "轻袭：选择一名手牌数小于你的角色，将手牌弃至与其相同，视为对其使用刺【杀】",
}

qingxix:addEffect("active", {
  anim_type = "offensive",
  prompt = "#qingxix",
  card_num = 0,
  target_num = 1,
  can_use = function(self, player)
    return not player:isKongcheng()
  end,
  card_filter = Util.FalseFunc,
  target_filter = function(self, player, to_select, selected)
    return #selected == 0 and to_select:getHandcardNum() < player:getHandcardNum() and
      not table.contains(player:getTableMark("qingxix-phase"), to_select.id)
  end,
  on_use = function(self, room, effect)
    local player = effect.from
    local target = effect.tos[1]
    room:addTableMark(player, "qingxix-phase", target.id)
    local n = player:getHandcardNum() - target:getHandcardNum()
    if n <= 0 then return end
    room:askToDiscard(player, {
      min_num = n,
      max_num = n,
      include_equip = false,
      skill_name = qingxix.name,
      cancelable = false,
    })
    room:useVirtualCard("stab__slash", nil, player, target, qingxix.name, true)
  end,
})

qingxix:addLoseEffect(function (self, player, is_death)
  player.room:setPlayerMark(player, "qingxix-phase", 0)
end)

return qingxix
