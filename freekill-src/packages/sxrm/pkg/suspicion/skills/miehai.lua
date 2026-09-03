
local miehai = fk.CreateSkill {
  name = "miehai",
}

Fk:loadTranslationTable{
  ["miehai"] = "灭害",
  [":miehai"] = "你可以将两张牌当无距离次数限制的刺【杀】使用，然后此流程中正面朝上失去过♠牌且已受伤的角色各摸两张牌并回复1点体力。",

  ["#miehai"] = "灭害：将两张牌当刺【杀】使用，直到结算结束，期间失去过♠牌且已受伤的角色摸两张牌并回复1点体力",
}

miehai:addEffect("viewas", {
  anim_type = "offensive",
  prompt = "#miehai",
  pattern = "stab__slash",
  handly_pile = true,
  card_filter = function(self, player, to_select, selected)
    return #selected < 2
  end,
  view_as = function(self, player, cards)
    if #cards ~= 2 then return end
    local c = Fk:cloneCard("stab__slash")
    c.skillName = miehai.name
    c:addSubcards(cards)
    return c
  end,
  before_use = function (self, player, use)
    use.extraUse = true
    local room = player.room
    local banner = room:getBanner(miehai.name) or {}
    local index = 1
    if #banner > 0 then
      index = banner[#banner][1][1] + 1
    end
    use.extra_data = use.extra_data or {}
    use.extra_data.miehai = index
    table.insert(banner, {{index}, {}})
    room:setBanner(miehai.name, banner)
  end,
  after_use = function (self, player, use)
    local room = player.room
    local banner = room:getBanner(miehai.name)
    local index = use.extra_data.miehai
    if banner == nil or index == nil then return end
    local tos
    for i = #banner, 1, -1 do
      if banner[i][1][1] == index then
        tos = banner[i][2]
        table.remove(banner, i)
      end
    end
    room:setBanner(miehai.name, #banner > 0 and banner or 0)
    if tos then
      tos = table.map(tos, Util.Id2PlayerMapper)
      tos = table.filter(tos, function (p)
        return p:isWounded() and not p.dead
      end)
      if #tos > 0 then
        room:sortByAction(tos)
        for _, p in ipairs(tos) do
          if not p.dead then
            p:drawCards(2, miehai.name)
            if not p.dead then
              room:recover{
                who = p,
                num = 1,
                recoverBy = player,
                skillName = miehai.name,
              }
            end
          end
        end
      end
    end
  end,
  enabled_at_response = function (self, player, response)
    return not response
  end,
})

miehai:addEffect(fk.AfterCardsMove, {
  can_refresh = function(self, event, target, player, data)
    return player.room:getBanner(miehai.name)
  end,
  on_refresh = function(self, event, target, player, data)
    local room = player.room
    local tos = {}
    for _, move in ipairs(data) do
      if move.from and move.to ~= move.from and (move.moveVisible == nil or move.moveVisible) and
        table.find(move.moveInfo, function (info)
          return Fk:getCardById(info.cardId).suit == Card.Spade and
            (info.fromArea == Card.PlayerHand or info.fromArea == Card.PlayerEquip)
        end) then
        table.insertIfNeed(tos, move.from)
      end
    end
    if #tos > 0 then
      local banner = room:getBanner(miehai.name)
      for _, info in ipairs(banner) do
        table.insertTableIfNeed(info[2], table.map(tos, Util.IdMapper))
      end
      room:setBanner(miehai.name, banner)
    end
  end,
})

miehai:addEffect("targetmod", {
  bypass_distances = function (self, player, skill, card, to)
    return card and table.contains(card.skillNames, miehai.name)
  end,
  bypass_times = function (self, player, skill, scope, card, to)
    return card and table.contains(card.skillNames, miehai.name)
  end,
})

return miehai
