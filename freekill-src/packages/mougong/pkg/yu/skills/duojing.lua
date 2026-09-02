local duojing = fk.CreateSkill({
  name = "duojing",
})

Fk:loadTranslationTable{
  ["duojing"] = "夺荆",
  [":duojing"] = "当你使用【杀】指定一名角色为目标后，你可以失去1点护甲，令此【杀】无视该角色的防具，然后你获得该角色的一张手牌，本阶段你使用【杀】的次数上限+1。",
  ["#duojing-invoke"] = "夺荆:失去1点护甲，令此【杀】无视%src的防具，获得%src一张手牌，本阶段用【杀】次数+1",

  ["$duojing1"] = "快舟轻甲，速袭其后！",
  ["$duojing2"] = "复取荆州，尽在掌握！",
}

duojing:addEffect(fk.TargetSpecified, {
  anim_type = "offensive",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(duojing.name) and data.card.trueName == "slash" and player.shield > 0
  end,
  on_cost = function(self, event, target, player, data)
    return player.room:askToSkillInvoke(player, { skill_name = duojing.name, prompt = "#duojing-invoke:" .. data.to.id })
  end,
  on_use = function(self, event, target, player, data)
    ---@type string
    local skillName = duojing.name
    local room = player.room
    room:changeShield(player, -1)
    local to = data.to
    to:addQinggangTag(data)
    if not player.dead and not to:isKongcheng() then
      local id = room:askToChooseCard(player, { target = to, flag = "h", skill_name = skillName })
      room:obtainCard(player, id, false, fk.ReasonPrey, player.id,skillName)
    end
    room:addPlayerMark(player, MarkEnum.SlashResidue .. "-phase")
  end,
})

return duojing
