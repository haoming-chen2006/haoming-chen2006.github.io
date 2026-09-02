local mouZongshi = fk.CreateSkill({
  name = "mou__zongshi",
  tags = { Skill.Compulsory },
})

Fk:loadTranslationTable{
  ["mou__zongshi"] = "宗室",
  [":mou__zongshi"] = "锁定技，当你受到伤害后，伤害来源弃置所有手牌（每名角色限一次）。",

  ["$mou__zongshi1"] = "是时候讨伐悖逆之人了。",
  ["$mou__zongshi2"] = "强汉之威，贼寇岂有不败之理？",
}

mouZongshi:addEffect(fk.Damaged, {
  anim_type = "control",
  can_trigger = function(self, event, target, player, data)
    if player:hasSkill(mouZongshi.name) and player == target and data.from and not data.from:isKongcheng() then
      local mark = player:getTableMark(mouZongshi.name)
      return not table.contains(mark, data.from.id)
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    room:addTableMark(player, mouZongshi.name, data.from.id)
    data.from:throwAllCards("h")
  end,
})

return mouZongshi
