local zhengyi = fk.CreateSkill {
  name = "zhengyi",
}

Fk:loadTranslationTable{
  ["zhengyi"] = "争义",
  [":zhengyi"] = "当你每回合首次受到伤害时，本轮你发动〖礼让〗的目标角色可以将此伤害转移给其。",

  ["#zhengyi-invoke"] = "争义：你可以将 %src 受到的伤害转移给你",
}

zhengyi:addEffect(fk.DamageInflicted, {
  anim_type = "defensive",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(zhengyi.name) and
      player:getMark("js__lirang-round") ~= 0 and
      #player.room.logic:getActualDamageEvents(1, function (e)
        return e.data.to == player
      end, Player.HistoryTurn) == 0 and
      player:usedSkillTimes(zhengyi.name, Player.HistoryTurn) == 0 and
      not player.room:getPlayerById(player:getMark("js__lirang-round")).dead
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local to = room:getPlayerById(player:getMark("js__lirang-round"))
    if room:askToSkillInvoke(to, {
      skill_name = zhengyi.name,
      prompt = "#zhengyi-invoke:"..player.id,
    }) then
      room:doIndicate(to, {player})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local n = data.damage
    data:preventDamage()
    local to = room:getPlayerById(player:getMark("js__lirang-round"))
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
