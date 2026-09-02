Fk:loadTranslationTable{
  ["liyu"] = "利驭",
  [":liyu"] = "当你使用【杀】对一名其他角色造成伤害后，你可获得其区域里的一张牌。然后若获得的牌不是装备牌，其摸一张牌；若获得的牌是装备牌，"..
  "则视为你对由其指定的另一名其他角色使用一张【决斗】。",

  ["#liyu-invoke"] = "利驭：你可获得 %dest 区域里的一张牌",
  ["#liyu-ask"] = "利驭：选择一名角色，视为 %src 对其使用【决斗】",

  ["$liyu1"] = "人不为己，天诛地灭。",
  ["$liyu2"] = "大丈夫，相时而动。",
}

local liyu = fk.CreateSkill{
  name = "liyu",
}

liyu:addEffect(fk.Damage, {
  anim_type = "offensive",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(liyu.name) and
      data.card and data.card.trueName == "slash" and
      data.to ~= player and not data.to.dead and not data.to:isAllNude()
  end,
  on_cost = function(self, event, target, player, data)
    if player.room:askToSkillInvoke(player, {
      skill_name = liyu.name,
      prompt = "#liyu-invoke::" .. data.to.id,
    }) then
      event:setCostData(self, {tos = {data.to}})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local to = data.to
    local id = room:askToChooseCard(player, {
      target = to,
      flag = "hej",
      skill_name = liyu.name,
    })
    room:obtainCard(player, id, true, fk.ReasonPrey, player, liyu.name)
    if to.dead then return end
    if Fk:getCardById(id).type ~= Card.TypeEquip then
      to:drawCards(1, liyu.name)
    else
      local card = Fk:cloneCard("duel")
      if player.dead or player:prohibitUse(card) then return false end
      local targets = table.filter(room.alive_players, function(p)
        return not player:isProhibited(p, card) and p ~= player and p ~= to
      end)
      if #targets == 0 then return false end
      local victim = room:askToChoosePlayers(to, {
        targets = targets,
        max_num = 1,
        min_num = 1,
        prompt = "#liyu-ask:" .. player.id,
        skill_name = liyu.name,
        cancelable = false,
      })[1]
      room:useVirtualCard("duel", nil, player, victim, liyu.name)
    end
  end,
})

return liyu
