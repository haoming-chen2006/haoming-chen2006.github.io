local tianming = fk.CreateSkill {
  name = "tianming",
}

Fk:loadTranslationTable {
  ["tianming"] = "天命",
  [":tianming"] = "当你成为【杀】的目标时，你可以弃置两张牌（不足则全弃，无牌则不弃），然后摸两张牌；然后若场上体力唯一最多的角色不为你，"..
  "该角色也可以如此做。",

  ["#tianming-invoke"] = "天命：你可以弃置两张牌（不足则全弃，无牌则不弃），然后摸两张牌",

  ["$tianming1"] = "皇汉国祚，千年不息！",
  ["$tianming2"] = "朕乃大汉皇帝，天命之子！",
}

tianming:addEffect(fk.TargetConfirmed, {
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(tianming.name) and data.card.trueName == "slash"
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local ids = table.filter(player:getCardIds("he"), function(id)
      return not player:prohibitDiscard(id)
    end)
    if #ids <= 2 then
      if room:askToSkillInvoke(player, {
        skill_name = tianming.name,
        prompt = "#tianming-invoke"
      }) then
        event:setCostData(self, {cards = ids})
        return true
      end
    else
      local cards = room:askToDiscard(player, {
        min_num = 2,
        max_num = 2,
        include_equip = true,
        skill_name = tianming.name,
        cancelable = true,
        prompt = "#tianming-invoke",
        skip = true,
      })
      if #cards > 0 then
        event:setCostData(self, {cards = cards})
        return true
      end
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    if #event:getCostData(self).cards > 0 then
      room:throwCard(event:getCostData(self).cards, tianming.name, player, player)
    end
    if not player.dead then
      player:drawCards(2, tianming.name)
    end
    local to = table.filter(room.alive_players, function (p)
      return table.every(room.alive_players, function (q)
        return p.hp >= q.hp
      end)
    end)
    if #to ~= 1 or to[1] == player then return end
    to = to[1]
    local ids = table.filter(to:getCardIds("he"), function(id)
      return not to:prohibitDiscard(id)
    end)
    if #ids <= 2 then
      if room:askToSkillInvoke(to, {
        skill_name = tianming.name,
        prompt = "#tianming-invoke"
      }) then
        if #ids > 0 then
          room:throwCard(ids, tianming.name, to, to)
        end
        if not to.dead then
          to:drawCards(2, tianming.name)
        end
      end
    else
      if #room:askToDiscard(to, {
        min_num = 2,
        max_num = 2,
        include_equip = true,
        skill_name = tianming.name,
        cancelable = true,
        prompt = "#tianming-invoke",
      }) == 2 and
        not to.dead then
        to:drawCards(2, tianming.name)
      end
    end
  end,
})

return tianming
