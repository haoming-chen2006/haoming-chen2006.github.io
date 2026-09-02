local juzhan = fk.CreateSkill {
  name = "juzhan",
  tags = {Skill.Switch},
}

Fk:loadTranslationTable{
  ["juzhan"] = "拒战",
  [":juzhan"] = "转换技，阳：当你成为其他角色使用【杀】的目标后，你可以与其各摸一张牌，然后其本回合不能再对你使用牌。"..
  "阴：当你使用【杀】指定一名角色为目标后，你可以获得其一张牌，然后你本回合不能再对其使用牌。",

  [":juzhan_yang"] = "转换技，<font color=\"#E0DB2F\">阳：当你成为其他角色使用【杀】的目标后，你可以与其各摸一张牌，" ..
  "然后其本回合不能再对你使用牌。</font>阴：当你使用【杀】指定一名角色为目标后，你可以获得其一张牌，然后你本回合不能再对其使用牌。",
  [":juzhan_yin"] = "转换技，阳：当你成为其他角色使用【杀】的目标后，你可以与其各摸一张牌，然后其本回合不能再对你使用牌。"..
  "<font color=\"#E0DB2F\">阴：当你使用【杀】指定一名角色为目标后，你可以获得其一张牌，然后你本回合不能再对其使用牌。</font>",

  ["@@juzhan-turn"] = "拒战",
  ["#juzhan-yang"] = "拒战：你可以与 %src 各摸一张牌，其本回合不能再对你使用牌",
  ["#juzhan-yin"] = "拒战：你可以获得 %src 一张牌，你本回合不能再对其使用牌",

  ["$juzhan1"] = "砍头便砍头，何为怒耶！",
  ["$juzhan2"] = "我州但有断头将军，无降将军也！",
}

juzhan:addEffect(fk.TargetConfirmed, {
  anim_type = "drawcard",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(juzhan.name) and data.card.trueName == "slash" and
      player:getSwitchSkillState(juzhan.name, false) == fk.SwitchYang and
      data.from ~= player and not data.from.dead
  end,
  on_cost = function (self, event, target, player, data)
    if player.room:askToSkillInvoke(player, {
      skill_name = juzhan.name,
      prompt = "#juzhan-yang:"..data.from.id,
    }) then
      event:setCostData(self, {tos = {data.from}})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    player:drawCards(1, juzhan.name)
    if data.from.dead then return end
    room:addTableMark(data.from, "@@juzhan-turn", player.id)
    data.from:drawCards(1, juzhan.name)
  end,
})
juzhan:addEffect(fk.TargetSpecified, {
  anim_type = "drawcard",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(juzhan.name) and data.card.trueName == "slash" and
      player:getSwitchSkillState(juzhan.name, false) == fk.SwitchYin and
      not data.to:isNude()
  end,
  on_cost = function (self, event, target, player, data)
    if player.room:askToSkillInvoke(player, {
      skill_name = juzhan.name,
      prompt = "#juzhan-yin:"..data.to.id,
    }) then
      event:setCostData(self, {tos = {data.to}})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local card = room:askToChooseCard(player, {
      target = data.to,
      flag = "he",
      skill_name = juzhan.name,
    })
    room:addTableMark(player, "@@juzhan-turn", data.to.id)
    room:obtainCard(player, card, false, fk.ReasonPrey, player, juzhan.name)
  end,
})
juzhan:addEffect("prohibit", {
  is_prohibited = function(self, from, to, card)
    return card and from and table.contains(from:getTableMark("@@juzhan-turn"), to.id)
  end,
})

return juzhan
