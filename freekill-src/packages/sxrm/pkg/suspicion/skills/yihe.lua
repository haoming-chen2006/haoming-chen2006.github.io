local yihe = fk.CreateSkill({
  name = "yihe",
  tags = { Skill.Compulsory },
})

Fk:loadTranslationTable{
  ["yihe"] = "异合",
  [":yihe"] = "锁定技，你的回合内各限一次，当一名角色受到伤害时，若其和伤害来源的体力值与手牌数大小关系：不同，此伤害+1；相同，双方各摸两张牌。",
}

yihe:addEffect(fk.DamageInflicted, {
  mute = true,
  can_trigger = function(self, event, target, player, data)
    if player:hasSkill(yihe.name) and player.room.current == player and data.from then
      local n1 = target:getHandcardNum() - target.hp
      local n2 = data.from:getHandcardNum() - data.from.hp
      if n1 * n2 <= 0 and n1 ~= n2 then
        return player:getMark("yihe1-turn") == 0
      else
        return player:getMark("yihe2-turn") == 0
      end
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local n1 = target:getHandcardNum() - target.hp
    local n2 = data.from:getHandcardNum() - data.from.hp
    player:broadcastSkillInvoke(yihe.name)
    if n1 * n2 <= 0 and n1 ~= n2 then
      room:setPlayerMark(player, "yihe1-turn", 1)
      if target == player then
        room:notifySkillInvoked(player, yihe.name, "negative")
      else
        room:notifySkillInvoked(player, yihe.name, "offensive")
      end
      data:changeDamage(1)
    else
      room:setPlayerMark(player, "yihe2-turn", 1)
      local targets = {target, data.from}
      player.room:sortByAction(targets)
      for _, p in ipairs(targets) do
        if not p.dead then
          p:drawCards(2, yihe.name)
        end
      end
    end
  end,
})

yihe:addLoseEffect(function (self, player, is_death)
  local room = player.room
  room:setPlayerMark(player, "yihe1-turn", 0)
  room:setPlayerMark(player, "yihe2-turn", 0)
end)

return yihe
