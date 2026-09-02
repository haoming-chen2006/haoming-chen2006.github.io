local jueyin = fk.CreateSkill {
  name = "jueyin",
}

Fk:loadTranslationTable{
  ["jueyin"] = "绝禋",
  [":jueyin"] = "当你每回合首次受到伤害后，你可以摸三张牌，然后本回合所有角色受到的伤害+1。",

  ["@jueyin-turn"] = "绝禋 伤害+",
}

jueyin:addEffect(fk.Damaged, {
  anim_type = "masochism",
  can_trigger = function(self, event, target, player, data)
    if target == player and player:hasSkill(jueyin.name) then
      local damage_events = player.room.logic:getActualDamageEvents(1, function(e)
        return e.data.to == player
      end, Player.HistoryTurn)
      return #damage_events == 1 and damage_events[1].data == data
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    player:drawCards(3, jueyin.name)
    local banner = room:getBanner("@jueyin-turn") or 0
    banner = banner + 1
    room:setBanner("@jueyin-turn", banner)
  end,
})

jueyin:addEffect(fk.DamageInflicted, {
  mute = true,
  is_delay_effect = true,
  can_trigger = function(self, event, target, player, data)
    return target == player and player.room:getBanner("@jueyin-turn")
  end,
  on_cost = Util.TrueFunc,
  on_use = function(self, event, target, player, data)
    data:changeDamage(player.room:getBanner("@jueyin-turn"))
  end,
})

return jueyin
