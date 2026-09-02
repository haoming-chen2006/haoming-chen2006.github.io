local kuiwei = fk.CreateSkill {
  name = "kuiwei",
}

Fk:loadTranslationTable{
  ["kuiwei"] = "溃围",
  [":kuiwei"] = "结束阶段开始时，你可以摸2+X张牌，然后将你的武将牌翻面。若如此做，在你的下个摸牌阶段开始时，你须弃置X张牌。"..
  "X等于当时场上装备区内的武器牌的数量。",

  ["#kuiwei-discard"] = "溃围：你需弃置%arg张牌",

  ["$kuiwei1"] = "齐兵列队，准备突围！",
  ["$kuiwei2"] = "休整片刻，且待我杀出一条血路！"
}

kuiwei:addEffect(fk.EventPhaseStart, {
  anim_type = "defensive",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(kuiwei.name) and player.phase == Player.Finish
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local n = 0
    for _, p in ipairs(room.alive_players) do
      n = n + #p:getEquipments(Card.SubtypeWeapon)
    end
    player:drawCards(2 + n, kuiwei.name)
    if player.dead then return end
    player:turnOver()
    if player.dead then return end
    room:addPlayerMark(player, kuiwei.name, 1)
  end,
})

kuiwei:addEffect(fk.EventPhaseStart, {
  anim_type = "negative",
  is_delay_effect = true,
  can_trigger = function(self, event, target, player, data)
    return target == player and player.phase == Player.Draw and player:getMark(kuiwei.name) > 0
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    room:setPlayerMark(player, "kuiwei", 0)
    local n = 0
    for _, p in ipairs(room.alive_players) do
      n = n + #p:getEquipments(Card.SubtypeWeapon)
    end
    if n == 0 then return end
    room:askToDiscard(player, {
      min_num = n,
      max_num = n,
      include_equip = true,
      skill_name = kuiwei.name,
      cancelable = false,
      prompt = "#kuiwei-discard:::"..n,
    })
  end,
})

return kuiwei
