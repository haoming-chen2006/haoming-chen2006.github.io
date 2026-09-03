
local xianger = fk.CreateSkill({
  name = "xianger",
  tags = { Skill.Quest },
})

Fk:loadTranslationTable{
  ["xianger"] = "香饵",
  [":xianger"] = "使命技，出牌阶段限一次，你可以令一名角色于其下个结束阶段回复2点体力，期间其不能使用点数大于6的牌。<br>"..
  "⬤　失败：期间其受到的伤害值小于2，你减1点体力上限。",

  ["#xianger"] = "香饵：选择一名角色，其下个结束阶段回复2点体力，期间其不能使用点数大于6的牌",
  ["@xianger"] = "香饵",
}

xianger:addEffect("active", {
  anim_type = "support",
  prompt = "#xianger",
  card_num = 0,
  target_num = 1,
  can_use = function(self, player)
    return player:usedEffectTimes(self.name, Player.HistoryPhase) == 0
  end,
  card_filter = Util.FalseFunc,
  target_filter = function(self, player, to_select, selected)
    return #selected == 0
  end,
  on_use = function(self, room, effect)
    local player = effect.from
    local target = effect.tos[1]
    room:addTableMark(target, xianger.name, { player, 2 })
  end,
})

xianger:addEffect(fk.EventPhaseStart, {
  mute = true,
  is_delay_effect = true,
  can_trigger = function(self, event, target, player, data)
    return target == player and player.phase == Player.Finish and
      player:getMark(xianger.name) ~= 0
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local mark = player:getMark(xianger.name)
    room:setPlayerMark(player, xianger.name, 0)
    for _, dat in ipairs(mark) do
      local src = dat[1]
      if not player.dead then
        room:recover{
          who = player,
          num = 2,
          recoverBy = src,
          skillName = xianger.name,
        }
      end
      if src:hasSkill(xianger.name) and dat[2] > 0 then
        src:broadcastSkillInvoke(xianger.name)
        room:notifySkillInvoked(src, xianger.name, "negative")
        room:updateQuestSkillState(src, xianger.name, false)
        room:changeMaxHp(src, -1)
        room:invalidateSkill(src, xianger.name)
      end
    end
  end,
})

xianger:addEffect(fk.Damaged, {
  can_refresh = function (self, event, target, player, data)
    return target == player and player:getMark(xianger.name) ~= 0
  end,
  on_refresh = function (self, event, target, player, data)
    local room = player.room
    local mark = player:getTableMark(xianger.name)
    for _, dat in ipairs(mark) do
      dat[2] = dat[2] - data.damage
    end
    room:setPlayerMark(player, xianger.name, mark)
  end,
})

xianger:addEffect("prohibit", {
  prohibit_use = function (self, player, card)
    return card and player:getMark(xianger.name) ~= 0 and card.number > 6
  end,
})

return xianger
