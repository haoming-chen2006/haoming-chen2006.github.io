
local fuzhu = fk.CreateSkill {
  name = "fuzhu",
}

Fk:loadTranslationTable{
  ["fuzhu"] = "伏诛",
  [":fuzhu"] = "一名男性角色结束阶段，若牌堆剩余牌数不大于你体力值的十倍，你可以依次对其使用牌堆中所有的【杀】（不能超过游戏人数），然后洗牌。",

  ["#fuzhu-invoke"] = "伏诛：你可以对 %dest 使用牌堆中所有【杀】！",

  ["$fuzhu1"] = "我连做梦都在等这一天呢。",
  ["$fuzhu2"] = "既然来了，就别想走了。",
}

fuzhu:addEffect(fk.EventPhaseStart, {
  anim_type = "offensive",
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(fuzhu.name) and target ~= player and target.phase == Player.Finish and
      target:isMale() and not target.dead and #player.room.draw_pile <= 10 * player.hp
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    if room:askToSkillInvoke(player, {
      skill_name = fuzhu.name,
      prompt = "#fuzhu-invoke::"..target.id,
    }) then
      event:setCostData(self, {tos = {target}})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local n = 0
    repeat
      n = n + 1
      local no_slash = true
      local slash
      for i = #room.draw_pile, 1, -1 do
        slash = Fk:getCardById(room.draw_pile[i])
        if slash.trueName == "slash" and player:canUseTo(slash, target, { bypass_times = true, bypass_distances = true }) then
          no_slash = false
          room:useCard({
            from = player,
            tos = {target},
            card = slash,
            extraUse = true,
          })
          break
        end
      end
      if no_slash then break end
    until (n >= #room.players or player.dead or target.dead or #room.draw_pile > 10 * player.hp)
    room:shuffleDrawPile()
  end,
})

return fuzhu
