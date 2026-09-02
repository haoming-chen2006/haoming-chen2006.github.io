
local wangxi = fk.CreateSkill{
  name = "wangxi",
}

Fk:loadTranslationTable{
  ["wangxi"] = "忘隙",
  [":wangxi"] = "当你对其他角色造成1点伤害后，或当你受到其他角色造成的1点伤害后，你可以与其各摸一张牌。",

  ["#wangxi-invoke"] = "忘隙：你可以与 %dest 各摸一张牌",

  ["$wangxi1"] = "大丈夫，何拘小节。",
  ["$wangxi2"] = "前尘往事，莫再提起。",
}

local spec = {
  anim_type = "masochism",
  trigger_times = function(self, event, target, player, data)
    return data.damage
  end,
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(wangxi.name) and
      data.from and data.from ~= data.to and not (data.from.dead or data.to.dead)
  end,
  on_cost = function(self, event, target, player, data)
    local to = data.from == player and data.to or data.from
    local room = player.room
    if room:askToSkillInvoke(player, {
      skill_name = self.name,
      prompt = "#wangxi-invoke::"..to.id,
    }) then
      event:setCostData(self, {tos = {to}})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local tos = {player}
    table.insertIfNeed(tos, data.from)
    table.insertIfNeed(tos, data.to)
    room:sortByAction(tos)
    for _, to in ipairs(tos) do
      if not to.dead then
        room:drawCards(to, 1, wangxi.name)
      end
    end
  end,
}

wangxi:addEffect(fk.Damage, spec)
wangxi:addEffect(fk.Damaged, spec)

return wangxi
