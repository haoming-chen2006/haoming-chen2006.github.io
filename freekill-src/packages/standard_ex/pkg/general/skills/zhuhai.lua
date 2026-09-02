Fk:loadTranslationTable{
  ["zhuhai"] = "诛害",
  [":zhuhai"] = "其他角色的结束阶段，若其本回合造成过伤害，你可以对其使用一张无距离限制的【杀】。",

  ["#zhuhai-ask"] = "诛害：你可以对 %dest 使用【杀】",

  ["$zhuhai1"] = "善恶有报，天道轮回！",
  ["$zhuhai2"] = "早知今日，何必当初！",
}

local zhuhai = fk.CreateSkill{
  name = "zhuhai",
}

zhuhai:addEffect(fk.EventPhaseStart, {
  anim_type = "offensive",
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(zhuhai.name) and player ~= target and target.phase == Player.Finish and not target.dead and
      #player.room.logic:getActualDamageEvents(1, function(e)
        return e.data.from == target
      end, Player.HistoryTurn) > 0
  end,
  on_cost = function (self, event, target, player, data)
    local use = player.room:askToUseCard(player, {
      skill_name = zhuhai.name,
      pattern = "slash",
      prompt = "#zhuhai-ask::"..target.id,
      cancelable = true,
      extra_data = {
        bypass_times = true,
        bypass_distances = true,
        extraUse = true,
        must_targets = {
          target.id,
        }},
      })
    if use then
      event:setCostData(self, {extra_data = use})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    player.room:useCard(event:getCostData(self).extra_data)
  end,
})

return zhuhai
