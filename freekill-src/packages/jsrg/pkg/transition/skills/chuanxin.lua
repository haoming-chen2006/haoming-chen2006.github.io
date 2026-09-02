local chuanxin = fk.CreateSkill {
  name = "js__chuanxin",
}

Fk:loadTranslationTable{
  ["js__chuanxin"] = "穿心",
  [":js__chuanxin"] = "一名角色结束阶段，你可以将一张牌当伤害值+X的【杀】使用（X为目标角色本回合回复过的体力值）。",

  ["#js__chuanxin-invoke"] = "穿心：你可以将一张牌当【杀】使用，伤害值增加目标本回合回复的体力值！",
}

chuanxin:addEffect(fk.EventPhaseStart, {
  anim_type = "offensive",
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(chuanxin.name) and target.phase == Player.Finish and
      not (player:isNude() and #player:getHandlyIds() == 0)
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local use = room:askToUseVirtualCard(player, {
      name = "slash",
      skill_name = chuanxin.name,
      prompt = "#js__chuanxin-invoke",
      cancelable = true,
      extra_data = {
        extraUse = true,
      },
      card_filter = {
        n = 1,
      },
      skip = true,
    })
    if use then
      event:setCostData(self, {extra_data = use})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local use = event:getCostData(self).extra_data
    local n = 0
    room.logic:getEventsOfScope(GameEvent.Recover, 999, function(e)
      local recover = e.data
      for _, p in ipairs(use.tos) do
        if recover.who == p then
          n = n + recover.num
        end
      end
    end, Player.HistoryTurn)
    use.additionalDamage = n
    room:useCard(use)
  end,
})

return chuanxin
