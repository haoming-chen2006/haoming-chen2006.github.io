
local enyuan = fk.CreateSkill {
  name = "enyuan",
}

Fk:loadTranslationTable{
  ["enyuan"] = "恩怨",
  [":enyuan"] = "当你一次得到一名其他角色至少两张牌后，你可以令其摸一张牌；当你受到1点伤害后，你可以令伤害来源选择一项：交给你一张手牌，"..
  "或失去1点体力。",

  ["#enyuan1-invoke"] = "恩怨：是否令 %dest 摸一张牌？",
  ["#enyuan2-invoke"] = "恩怨：你可以令 %dest 选择交给你一张手牌或失去1点体力",
  ["#enyuan-give"] = "恩怨：你需交给 %src 一张手牌，否则失去1点体力",

  ["$enyuan1"] = "报之以李，还之以桃。",
  ["$enyuan2"] = "伤了我，休想全身而退！",
}

enyuan:addEffect(fk.AfterCardsMove, {
  mute = true,
  can_trigger = function(self, event, target, player, data)
    if player:hasSkill(enyuan.name) then
      local dat = {}
      for _, move in ipairs(data) do
        if move.from and move.from ~= player and move.to == player and move.toArea == Card.PlayerHand and
          not move.from.dead then
          for _, info in ipairs(move.moveInfo) do
            if info.fromArea == Card.PlayerHand or info.fromArea == Card.PlayerEquip then
              dat[move.from.id] = (dat[move.from.id] or 0) + 1
            end
          end
        end
      end
      local targets = {}
      for id, num in pairs(dat) do
        if num > 1 then
          table.insert(targets, id)
        end
      end
      if #targets > 0 then
        event:setCostData(self, {extra_data = table.map(targets, Util.Id2PlayerMapper)})
        return true
      end
    end
  end,
  on_trigger = function(self, event, target, player, data)
    local targets = table.simpleClone(event:getCostData(self).extra_data)
    player.room:sortByAction(targets)
    for _, p in ipairs(targets) do
      if not player:hasSkill(enyuan.name) then return end
      if not p.dead then
        event:setCostData(self, {tos = {p}})
        self:doCost(event, target, player, data)
      end
    end
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local to = event:getCostData(self).tos[1]
    if room:askToSkillInvoke(player, {
      skill_name = enyuan.name,
      prompt = "#enyuan1-invoke::"..to.id,
    }) then
      event:setCostData(self, {tos = {to}})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    player:broadcastSkillInvoke(enyuan.name, 1)
    room:notifySkillInvoked(player, enyuan.name, "support")
    local to = event:getCostData(self).tos[1]
    to:drawCards(1, enyuan.name)
  end,
})

enyuan:addEffect(fk.Damaged, {
  mute = true,
  trigger_times = function (self, event, target, player, data)
    return data.damage
  end,
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(enyuan.name) and
      data.from and data.from ~= player and not data.from.dead
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    if room:askToSkillInvoke(player, {
      skill_name = enyuan.name,
      prompt = "#enyuan2-invoke::"..data.from.id,
    }) then
      event:setCostData(self, {tos = {data.from}})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    player:broadcastSkillInvoke(enyuan.name, 2)
    room:notifySkillInvoked(player, enyuan.name, "masochism")
    if data.from:isKongcheng() then
      room:loseHp(data.from, 1, enyuan.name)
    else
    local card = room:askToCards(data.from, {
      skill_name = enyuan.name,
      min_num = 1,
      max_num = 1,
      include_equip = false,
      pattern = ".|.|.|hand",
      prompt = "#enyuan-give:"..player.id,
      cancelable = true,
    })
    if #card > 0 then
      room:obtainCard(player, card, true, fk.ReasonGive, data.from, enyuan.name)
    else
      room:loseHp(data.from, 1, enyuan.name)
    end
    end
  end,
})

return enyuan
