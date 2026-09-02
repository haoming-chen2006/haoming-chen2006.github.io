local mouXiayuan = fk.CreateSkill({
  name = "mou__xiayuan",
})

Fk:loadTranslationTable{
  ["mou__xiayuan"] = "狭援",
  [":mou__xiayuan"] = "每轮限一次，其他角色受到伤害后，若此伤害令其失去全部护甲，则你可以弃置两张手牌，令其获得本次伤害结算中其失去的护甲。",
  ["#mou__xiayuan-card"] = "狭援：你可以弃置两张手牌，令 %dest 获得%arg点护甲",

  ["$mou__xiayuan1"] = "速置粮草，驰援天柱山。",
  ["$mou__xiayuan2"] = "援军既至，定攻克此地！",
}

mouXiayuan:addEffect(fk.Damaged, {
  anim_type = "support",
  can_trigger = function(self, event, target, player, data)
    return
      target ~= player and
      player:hasSkill(mouXiayuan.name) and
      player:usedSkillTimes(mouXiayuan.name, Player.HistoryRound) == 0 and
      player:getHandcardNum() > 1 and
      target.shield < 5 and
      data.extra_data and
      data.extra_data.mou__xiayuan_num
  end,
  on_cost = function(self, event, target, player, data)
    local cards = player.room:askToDiscard(
      player,
      {
        min_num = 2,
        max_num = 2,
        include_equip = false,
        skill_name = mouXiayuan.name,
        pattern = ".",
        prompt = "#mou__xiayuan-card::" .. target.id .. ":" .. data.extra_data.mou__xiayuan_num,
        skip = true,
      }
    )
    if #cards == 2 then
      event:setCostData(self, cards)
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    room:throwCard(event:getCostData(self), mouXiayuan.name, player, player)
    if target:isAlive() then
      room:changeShield(target, data.extra_data.mou__xiayuan_num)
    end
  end,
})

mouXiayuan:addEffect(fk.HpChanged, {
  can_refresh = function (self, event, target, player, data)
    return target == player and player.shield == 0 and data.reason == "damage" and data.shield_lost > 0
  end,
  on_refresh = function (self, event, target, player, data)
    local e = player.room.logic:getCurrentEvent():findParent(GameEvent.Damage)
    if e then
      local damage = e.data
      damage.extra_data = damage.extra_data or {}
      damage.extra_data.mou__xiayuan_num = data.shield_lost
    end
  end,
})

return mouXiayuan
