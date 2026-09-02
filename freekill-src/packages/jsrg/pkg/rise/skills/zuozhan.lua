local zuozhan = fk.CreateSkill {
  name = "zuozhan",
}

Fk:loadTranslationTable{
  ["zuozhan"] = "坐瞻",
  [":zuozhan"] = "游戏开始时，你选择你与至多两名其他角色，你的攻击范围+X（X为你选择角色中最大的体力值，至多为5）。当“坐瞻”角色死亡后，"..
  "你令一名存活的“坐瞻”角色从弃牌堆中获得至多X张牌名各不相同的基本牌。",

  ["#zuozhan-choose"] = "坐瞻：请选择至多两名“坐瞻”角色，你的攻击范围增加你和这些角色中最大的体力值",
  ["@@zuozhan"] = "坐瞻",
  ["#zuozhan-prey"] = "坐瞻：令一名“坐瞻”角色从弃牌堆获得至多%arg张牌名各不相同的基本牌",
  ["#zuozhan"] = "坐瞻：获得至多%arg张牌名各不相同的基本牌",
}

zuozhan:addEffect(fk.GameStart, {
  anim_type = "special",
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(zuozhan.name)
  end,
  on_cost = Util.TrueFunc,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local tos = {}
    if #room:getOtherPlayers(player, false) > 0 then
      tos = room:askToChoosePlayers(player, {
        targets = room:getOtherPlayers(player, false),
        min_num = 1,
        max_num = 2,
        prompt = "#zuozhan-choose",
        skill_name = zuozhan.name,
        cancelable = false,
      })
    end
    table.insert(tos, player)
    room:setPlayerMark(player, zuozhan.name, table.map(tos, Util.IdMapper))
    for _, p in ipairs(tos) do
      room:addPlayerMark(p, "@@zuozhan", 1)
    end
  end,
})

Fk:addPoxiMethod{
  name = "zuozhan",
  prompt = function (data, extra_data)
    return "#zuozhan:::"..math.floor(extra_data.num)
  end,
  card_filter = function(to_select, selected, data, extra_data)
    return #selected < extra_data.num
  end,
  feasible = function(selected, data)
    if data and #data >= #selected then
      local areas = {}
      for _, id in ipairs(selected) do
        for _, v in ipairs(data) do
          if table.contains(v[2], id) then
            table.insertIfNeed(areas, v[2])
            break
          end
        end
      end
      return #areas >= #selected
    end
  end,
  default_choice = function(data)
    if not data then return {} end
    local cids = table.map(data, function(v) return v[2][1] end)
    return cids
  end,
}

zuozhan:addEffect(fk.Deathed, {
  anim_type = "support",
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(zuozhan.name) and table.contains(player:getTableMark(zuozhan.name), target.id)
  end,
  on_cost = Util.TrueFunc,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local nums = {0}
    local targets = table.filter(player:getTableMark(zuozhan.name), function (id)
      return not room:getPlayerById(id).dead
    end)
    targets = table.map(targets, Util.Id2PlayerMapper)
    for _, p in ipairs(targets) do
      table.insert(nums, p.hp)
    end
    local n = math.max(table.unpack(nums))
    if n == 0 then return end
    local cards = {}
    for _, id in ipairs(room.discard_pile) do
      local card = Fk:getCardById(id)
      if card.type == Card.TypeBasic then
        cards[card.trueName] = cards[card.trueName] or {}
        table.insert(cards[card.trueName], id)
      end
    end
    if next(cards) == nil then return end
    local to = room:askToChoosePlayers(player, {
      targets = targets,
      min_num = 1,
      max_num = 1,
      prompt = "#zuozhan-prey:::"..n,
      skill_name = zuozhan.name,
      cancelable = false,
    })[1]
    local card_data = {}
    for _, name in ipairs({"slash", "jink", "peach", "analeptic"}) do
      if cards[name] then
        table.insert(card_data, {name, cards[name]})
      end
    end
    for name, ids in pairs(cards) do
      if not table.contains({"slash", "jink", "peach", "analeptic"}, name) and #ids > 0 then
        table.insert(card_data, {name, ids})
      end
    end
    local ret = room:askToPoxi(to, {
      poxi_type = zuozhan.name,
      data = card_data,
      extra_data = {
        num = n,
      },
      cancelable = false,
    })
    room:moveCardTo(ret, Card.PlayerHand, to, fk.ReasonJustMove, zuozhan.name, nil, true, to)
  end,
})

zuozhan:addEffect("atkrange", {
  correct_func = function (self, from, to)
    if from:getMark(zuozhan.name) ~= 0 then
      local nums = {0}
      for _, id in ipairs(from:getTableMark(zuozhan.name)) do
        local p = Fk:currentRoom():getPlayerById(id)
        table.insert(nums, p.hp)
      end
      return math.max(table.unpack(nums))
    end
  end,
})

zuozhan:addLoseEffect(function (self, player, is_death)
  local room = player.room
  for _, id in ipairs(player:getTableMark(zuozhan.name)) do
    local p = room:getPlayerById(id)
    room:removePlayerMark(p, "@@zuozhan", 1)
  end
  room:setPlayerMark(player, zuozhan.name, 0)
end)

return zuozhan
