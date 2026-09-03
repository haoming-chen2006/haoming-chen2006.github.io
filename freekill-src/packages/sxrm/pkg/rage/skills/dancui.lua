
local dancui = fk.CreateSkill {
  name = "dancui",
  tags = { Skill.Contract },
}

Fk:loadTranslationTable{
  ["dancui"] = "殚瘁",
  [":dancui"] = "<a href='sxrm__contract'>契定技</a>，当你造成伤害时，你可以弃置两张牌（没有则不弃），令此伤害+1。",

  ["#dancui-invoke"] = "殚瘁：弃置两张牌（没有则不弃），令你对 %dest 造成的伤害+1",
}

dancui:addEffect(fk.DamageCaused, {
  anim_type = "offensive",
  on_cost = function (self, event, target, player, data)
    local room = player.room
    if table.contains(player:getTableMark("contracted_skills"), dancui.name) then
      local cards = room:askToDiscard(player, {
        min_num = 2,
        max_num = 2,
        include_equip = true,
        skill_name = dancui.name,
        prompt = "#dancui-invoke::"..data.to.id,
        cancelable = false,
        skip = true,
      })
      event:setCostData(self, { cards = cards })
      return true
    else
      local ids = table.filter(player:getCardIds("he"), function (id)
        return not player:prohibitDiscard(id)
      end)
      if #ids < 2 then
        if room:askToSkillInvoke(player, {
          skill_name = dancui.name,
          prompt = "#dancui-invoke::"..data.to.id,
        }) then
          event:setCostData(self, { cards = ids })
          return true
        end
      else
        local cards = room:askToDiscard(player, {
          min_num = 2,
          max_num = 2,
          include_equip = true,
          skill_name = dancui.name,
          prompt = "#dancui-invoke::"..data.to.id,
          cancelable = true,
          skip = true,
        })
        if #cards > 0 then
          event:setCostData(self, { cards = cards })
          return true
        end
      end
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    room:addTableMarkIfNeed(player, "contracted_skills", dancui.name)
    local cards = event:getCostData(self).cards or {}
    if #cards > 0 then
      room:throwCard(cards, dancui.name, player, player)
    end
    data:changeDamage(1)
  end,
})

return dancui
