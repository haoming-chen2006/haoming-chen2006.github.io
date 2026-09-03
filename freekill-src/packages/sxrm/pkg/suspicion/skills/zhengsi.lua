local zhengsi = fk.CreateSkill({
  name = "zhengsi",
})

Fk:loadTranslationTable{
  ["zhengsi"] = "争嗣",
  [":zhengsi"] = "出牌阶段，你可以选择包括你在内的三名有手牌的角色，令其中一名角色先展示一张手牌，其余角色再同时展示一张手牌："..
  "点数最大的角色弃置两张手牌，点数最小的角色失去1点体力。",

  ["#zhengsi"] = "争嗣：你和两名其他角色各展示一张手牌，点数最大的弃两张手牌，点数最小的失去1点体力",
  ["#zhengsi-choose"] = "争嗣：选择一名角色先展示牌，然后其余两名角色再同时展示",
  ["#zhengsi-ask"] = "争嗣：展示一张手牌，若点数最大则弃两张手牌，若点数最小则失去体力",
}

zhengsi:addEffect("active", {
  anim_type = "offensive",
  prompt = "#zhengsi",
  card_num = 0,
  target_num = 2,
  can_use = function(self, player)
    return not player:isKongcheng() and
      #table.filter(Fk:currentRoom().alive_players, function (p)
        return p ~= player and not p:isKongcheng()
      end) > 1
  end,
  card_filter = Util.FalseFunc,
  target_filter = function(self, player, to_select, selected)
    return #selected < 2 and to_select ~= player and not to_select:isKongcheng()
  end,
  on_use = function(self, room, effect)
    local player = effect.from
    local targets = table.simpleClone(effect.tos)
    table.insert(targets, player)
    local mark = player:getTableMark("zhengsi-phase")
    table.insertTableIfNeed(mark, table.map(targets, Util.IdMapper))
    room:setPlayerMark(player, "zhengsi-phase", mark)
    local mapper = {}
    local to = room:askToChoosePlayers(player, {
      min_num = 1,
      max_num = 1,
      targets = targets,
      skill_name = zhengsi.name,
      prompt = "#zhengsi-choose",
      cancelable = false,
    })[1]
    local id1 = room:askToCards(to, {
      min_num = 1,
      max_num = 1,
      include_equip = false,
      skill_name = zhengsi.name,
      prompt = "#zhengsi-ask",
      cancelable = false,
    })[1]
    mapper[to] = Fk:getCardById(id1).number
    to:showCards(id1)
    table.removeOne(targets, to)
    targets = table.filter(targets, function (p)
      return not p:isKongcheng() and not p.dead
    end)
    if #targets > 0 then
      local result = room:askToJointCards(player, {
        players = targets,
        min_num = 1,
        max_num = 1,
        include_equip = false,
        skill_name = zhengsi.name,
        cancelable = false,
        prompt = "#zhengsi-ask",
      })
      for p, ids in pairs(result) do
        mapper[p] = Fk:getCardById(ids[1]).number
        if table.contains(p:getCardIds("h"), ids[1]) then
          p:showCards(ids[1])
        end
      end
    end
    local max, min = 0, 14
    for _, n in pairs(mapper) do
      if n > max then
        max = n
      end
      if n < min then
        min = n
      end
    end
    targets = effect.tos
    table.insert(targets, player)
    room:sortByAction(targets)
    for _, p in ipairs(targets) do
      if not p.dead then
        if mapper[p] == max then
          room:askToDiscard(p, {
            min_num = 2,
            max_num = 2,
            include_equip = false,
            skill_name = zhengsi.name,
            cancelable = false,
          })
        end
        if not p.dead then
          if mapper[p] == min then
            room:loseHp(p, 1)
          end
        end
      end
    end
  end,
})

return zhengsi
