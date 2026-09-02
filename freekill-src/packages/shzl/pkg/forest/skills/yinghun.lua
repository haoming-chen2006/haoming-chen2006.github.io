local yinghun = fk.CreateSkill {
  name = "yinghun",
}

Fk:loadTranslationTable{
  ["yinghun"] = "英魂",
  [":yinghun"] = "准备阶段，若你已受伤，你可以选择一名其他角色并选择一项：1.令其摸X张牌，然后弃置一张牌；2.令其摸一张牌，然后弃置X张牌"..
  "（X为你已损失的体力值）。",

  ["yinghun_active"] = "英魂",
  ["#yinghun-choose"] = "英魂：你可以令一名其他角色：摸%arg张牌然后弃置一张牌，或摸一张牌然后弃置%arg张牌",
  ["#yinghun-draw"] = "摸%arg张牌，弃置1张牌",
  ["#yinghun-discard"] = "摸1张牌，弃置%arg张牌",

  ["$yinghun1"] = "以吾魂魄，保佑吾儿之基业。",
  ["$yinghun2"] = "不诛此贼三族，则吾死不瞑目！",
}

yinghun:addAuxActiveSkill("yinghun_active", {
  card_num = 0,
  target_num = 1,
  card_filter = Util.FalseFunc,
  target_filter = function(self, player, to_select, selected, selected_cards, card, extra_data)
    return #selected == 0 and to_select ~= player
  end,
  interaction = function(self, player)
    local n = player:getLostHp()
    local choices = { "#yinghun-draw:::" .. n }
    if n > 1 then
      table.insert(choices, "#yinghun-discard:::" .. n)
    end
    return UI.OptionBox { options = choices, direct_send = true, }
  end,
})

yinghun:addEffect(fk.EventPhaseStart, {
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(yinghun.name) and player.phase == Player.Start and player:isWounded() and
      #player.room:getOtherPlayers(player, false) > 0
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local success, dat = room:askToUseActiveSkill(player, {
      skill_name = "yinghun_active",
      prompt = "#yinghun-choose:::"..player:getLostHp(),
      cancelable = true,
    })
    if success and dat then
      local cost_data = { tos = dat.targets, extra_data = dat.interaction }
      if dat.interaction:startsWith("#yinghun-draw") then
        cost_data.audio_index = 1
        cost_data.anim_type = "support"
      else
        cost_data.audio_index = 2
        cost_data.anim_type = "control"
      end
      event:setCostData(self, cost_data)
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local dat = event:getCostData(self)
    local to = dat.tos[1]
    local n = player:getLostHp()
    if dat.extra_data:startsWith("#yinghun-draw") then
      to:drawCards(n, yinghun.name)
      if not to.dead then
        room:askToDiscard(to, {
          skill_name = yinghun.name,
          cancelable = false,
          min_num = 1,
          max_num = 1,
          include_equip = true,
        })
      end
    else
      to:drawCards(1, yinghun.name)
      if not to.dead then
        room:askToDiscard(to, {
          skill_name = yinghun.name,
          cancelable = false,
          min_num = n,
          max_num = n,
          include_equip = true,
        })
      end
    end
  end,
})

return yinghun
