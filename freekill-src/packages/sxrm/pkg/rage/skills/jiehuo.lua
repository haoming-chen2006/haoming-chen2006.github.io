
local jiehuo = fk.CreateSkill {
  name = "jiehuo",
  tags = { Skill.Quest },
}

Fk:loadTranslationTable{
  ["jiehuo"] = "劫火",
  [":jiehuo"] = "使命技，回合开始时，你可以令场上下次出现的伤害改为3点火焰伤害。<br>"..
  "⬤　失败：若造成此伤害的角色不为你，你减1点体力上限。",

  ["#jiehuo-invoke"] = "劫火：你可以令场上下次出现的伤害改为3点火焰伤害！",
  ["@@jiehuo"] = "劫火",
}

jiehuo:addEffect(fk.TurnStart, {
  anim_type = "offensive",
  can_trigger = function (self, event, target, player, data)
    return target == player and player:hasSkill(jiehuo.name) and
      player:getQuestSkillState(jiehuo.name) == nil
  end,
  on_cost = function(self, event, target, player, data)
    return player.room:askToSkillInvoke(player, {
      skill_name = jiehuo.name,
      prompt = "#jiehuo-invoke",
    })
  end,
  on_use = function (self, event, target, player, data)
    local room = player.room
    local banner = room:getBanner("@@jiehuo") or {}
    table.insertIfNeed(banner, player)
    room:setBanner("@@jiehuo", banner)
  end,
})

jiehuo:addEffect(fk.DamageCaused, {
  mute = true,
  is_delay_effect = true,
  can_trigger = function (self, event, target, player, data)
    return table.contains(player.room:getBanner("@@jiehuo") or {}, player)
  end,
  on_use = function (self, event, target, player, data)
    local room = player.room
    data.damageType = fk.FireDamage
    data:changeDamage(3 - data.damage)
    local banner = room:getBanner("@@jiehuo")
    table.removeOne(banner, player)
    room:setBanner("@@jiehuo", #banner == 0 and 0 or banner)
    if target ~= player and player:hasSkill(jiehuo.name) then
      player:broadcastSkillInvoke(jiehuo.name)
      room:notifySkillInvoked(player, jiehuo.name, "negative")
      room:updateQuestSkillState(player, jiehuo.name, true)
      room:changeMaxHp(player, -1)
      room:invalidateSkill(player, jiehuo.name)
    end
  end,
})

return jiehuo
