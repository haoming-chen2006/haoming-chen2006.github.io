local zhengyi = fk.CreateSkill {
  name = "re__zhengyi",
}

Fk:loadTranslationTable{
  ["re__zhengyi"] = "争义",
  [":re__zhengyi"] = "本轮“礼让”角色中获得牌数唯一最少的角色每回合首次受到伤害时，获得牌数唯一最多的角色可以将此伤害转移给其。",

  ["#re__zhengyi-invoke"] = "争义：你可以将 %src 受到的伤害转移给你",
}

zhengyi:addEffect(fk.DamageInflicted, {
  anim_type = "defensive",
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(zhengyi.name) and player:getMark("re__lirang-round") ~= 0 and
      target.id == player:getMark("re__lirang-round")[2] and
      #player.room.logic:getActualDamageEvents(1, function (e)
        return e.data.to == target
      end, Player.HistoryTurn) == 0 and
      player:usedSkillTimes(zhengyi.name, Player.HistoryTurn) == 0 and
      not player.room:getPlayerById(player:getMark("re__lirang-round")[1]).dead
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local to = room:getPlayerById(player:getMark("re__lirang-round")[1])
    if room:askToSkillInvoke(to, {
      skill_name = zhengyi.name,
      prompt = "#zhengyi-invoke:"..target.id,
    }) then
      room:doIndicate(to, {target})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local n = data.damage
    data:preventDamage()
    local to = room:getPlayerById(player:getMark("re__lirang-round")[1])
    room:damage{
      from = data.from,
      to = to,
      damage = n,
      damageType = data.damageType,
      skillName = data.skillName,
      chain = data.chain,
      card = data.card,
    }
  end,
})

return zhengyi
