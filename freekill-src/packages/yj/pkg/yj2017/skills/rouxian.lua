local rouxian = fk.CreateSkill{
  name = "rouxian",
}

Fk:loadTranslationTable{
  ["rouxian"] = "柔弦",
  [":rouxian"] = "当你受到伤害后，你可以令伤害来源回复1点体力并弃置一张装备牌。",

  ["#rouxian-invoke"] = "柔弦：你可以令 %dest 回复1点体力并弃置一张装备",

  ["$rouxian"] = "君子以琴会友，以瑟辅人。",
}

rouxian:addEffect(fk.Damaged, {
  anim_type = "masochism",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(rouxian.name) and
      data.from and not data.from.dead
  end,
  on_cost = function (self, event, target, player, data)
    local room = player.room
    if room:askToSkillInvoke(player, {
      skill_name = rouxian.name,
      prompt = "#rouxian-invoke::"..data.from.id,
    }) then
      event:setCostData(self, {tos = {data.from}})
      return true
    end
  end,
  on_use = function (self, event, target, player, data)
    local room = player.room
    if data.from:isWounded() then
      room:recover{
        who = data.from,
        num = 1,
        recoverBy = player,
        skillName = rouxian.name,
      }
    end
    if not data.from.dead and not data.from:isNude() then
      room:askToDiscard(data.from, {
        min_num = 1,
        max_num = 1,
        include_equip = true,
        skill_name = rouxian.name,
        cancelable = false,
        pattern = ".|.|.|.|.|equip",
      })
    end
  end,
})

return rouxian
