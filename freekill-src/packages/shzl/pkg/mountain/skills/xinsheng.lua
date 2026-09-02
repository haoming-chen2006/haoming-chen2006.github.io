local xinsheng = fk.CreateSkill {
  name = "xinsheng",
}

Fk:loadTranslationTable{
  ["xinsheng"] = "新生",
  [":xinsheng"] = "当你受到1点伤害后，你可以获得一张“化身”。",

  ["$xinsheng1"] = "幻幻无穷，生生不息。",
  ["$xinsheng2"] = "吐故纳新，师法天地。",
}

local U = require "packages.utility.utility"

xinsheng:addEffect(fk.Damaged, {
  anim_type = "masochism",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(xinsheng.name) and #player.room.general_pile > 0
  end,
  trigger_times = function(self, event, target, player, data)
    return data.damage
  end,
  on_cost = function(self, event, target, player, data)
    if player.room:askToSkillInvoke(player, {
      skill_name = xinsheng.name,
    }) then
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local generals = U.getPrivateMark(player, "&huanshen")
    table.insert(generals, room:getNGenerals(1)[1])
    U.setPrivateMark(player, "&huanshen", generals)
  end,
})

return xinsheng
