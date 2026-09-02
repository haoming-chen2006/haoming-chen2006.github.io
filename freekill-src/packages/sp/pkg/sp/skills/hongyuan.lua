local hongyuan = fk.CreateSkill {
  name = "hongyuan",
}

Fk:loadTranslationTable{
  ["hongyuan"] = "弘援",
  [":hongyuan"] = "摸牌阶段，你可以少摸一张牌，令至多两名其他角色各摸一张牌。",

  ["#hongyuan-choose"] = "弘援：你可以少摸一张牌，令至多两名其他角色各摸一张牌",

  ["$hongyuan1"] = "诸将莫慌，粮草已到。",
  ["$hongyuan2"] = "自舍其身，施于天下。",
}

hongyuan:addEffect(fk.DrawNCards, {
  anim_type = "support",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(hongyuan.name) and
      data.n > 0 and #player.room:getOtherPlayers(player, false) > 0
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local tos = room:askToChoosePlayers(player, {
      targets = room:getOtherPlayers(player, false),
      min_num = 1,
      max_num = 2,
      prompt = "#hongyuan-choose",
      skill_name = hongyuan.name,
      cancelable = true,
    })
    if #tos > 0 then
      event:setCostData(self, {tos = tos})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    data.n = data.n - 1
    data.extra_data = data.extra_data or {}
    data.extra_data.hongyuan = event:getCostData(self).tos
  end,
})

hongyuan:addEffect(fk.AfterDrawNCards, {
  mute = true,
  is_delay_effect = true,
  can_trigger = function(self, event, target, player, data)
    return target == player and data.extra_data and data.extra_data.hongyuan
  end,
  on_use = function(self, event, target, player, data)
    local tos = table.simpleClone(data.extra_data.hongyuan)
    for _, p in ipairs(tos) do
      if not p.dead then
        p:drawCards(1, hongyuan.name)
      end
    end
  end,
})

return hongyuan
