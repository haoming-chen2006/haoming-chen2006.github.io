local mouQiaomeng = fk.CreateSkill({
  name = "mou__qiaomeng",
})

Fk:loadTranslationTable{
  ["mou__qiaomeng"] = "趫猛",
  [":mou__qiaomeng"] = "当你使用【杀】对一名角色造成伤害后，若你拥有技能“义从”，你可以选择一项：1.弃置其区域内的一张牌并摸一张牌；" ..
  "2.获得3点蓄力点。",
  ["mou__qiaomeng_discard"] = "弃置%dest区域内的一张牌且你摸一张牌",
  ["mou__qiaomeng_gain"] = "获得3点蓄力点",

  ["$mou__qiaomeng1"] = "观今天下，何有我义从之敌。",
  ["$mou__qiaomeng2"] = "众将征战所得，皆为汝等所有。",
}

local U = require "packages.utility.utility"

mouQiaomeng:addEffect(fk.Damage, {
  anim_type = "offensive",
  can_trigger = function(self, event, target, player, data)
    return
      target == player and
      data.card and
      data.card.trueName == "slash" and
      player:hasSkill(mouQiaomeng.name) and
      player:hasSkill("mou__yicong", true)
  end,
  on_cost = function (self, event, target, player, data)
    local room = player.room
    local choices = { "mou__qiaomeng_discard::" .. data.to.id, "mou__qiaomeng_gain", "Cancel" }

    local choice = room:askToChoice(player, { choices = choices, skill_name = mouQiaomeng.name })
    if choice == "Cancel" then
      return false
    end

    event:setCostData(self, choice)
    return true
  end,
  on_use = function(self, event, target, player, data)
    ---@type string
    local skillName = mouQiaomeng.name
    local room = player.room
    if event:getCostData(self):startsWith("mou__qiaomeng_discard") then
      if data.to:isAlive() and not data.to:isAllNude() then
        local id = room:askToChooseCard(player, { target = data.to, flag = "hej", skill_name = skillName })
        room:throwCard(id, skillName, data.to, player)
      end
      player:drawCards(1, skillName)
    else
      U.skillCharged(player, 3)
    end
  end,
})

return mouQiaomeng
