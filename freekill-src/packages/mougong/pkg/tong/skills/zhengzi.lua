local zhengzi = fk.CreateSkill({
  name = "zhengzi",
})

Fk:loadTranslationTable {
  ["zhengzi"] = "整辎",
  [":zhengzi"] = "回合结束时，若你于此回合内造成过的伤害值之和不小于X（X为你的体力值），你可以回复1点体力并复原武将牌。",

  ["$zhengzi1"] = "整军深垒，备以待敌。",
  ["$zhengzi2"] = "整甲缮兵，以乘其敝。",
}

zhengzi:addEffect(fk.TurnEnd, {
  anim_type = "drawcard",
  can_trigger = function(self, event, target, player, data)
    if target == player and player:hasSkill(zhengzi.name) then
      local x = 0
      player.room.logic:getActualDamageEvents(1, function(e)
        local damage = e.data
        if damage.from == player then
          x = x + damage.damage
          return x >= player.hp
        end
        return false
      end)
      return x >= player.hp
    end
  end,
  on_use = function(self, event, target, player, data)
    player.room:changeHp(player, 1, "recover", "zhengzi")
    if not player.dead then
      player:reset()
    end
  end,
})

return zhengzi
