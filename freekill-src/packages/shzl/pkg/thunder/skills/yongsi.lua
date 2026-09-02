local yongsi = fk.CreateSkill {
  name = "thunder__yongsi",
  tags = {Skill.Compulsory},
}

Fk:loadTranslationTable{
  ["thunder__yongsi"] = "庸肆",
  [":thunder__yongsi"] = "锁定技，摸牌阶段，你改为摸X张牌（X为场上现存势力数）。出牌阶段结束时，若你本回合没有造成过伤害，你将手牌补至"..
  "当前体力值；若造成过伤害且大于1点，你本回合手牌上限改为已损失体力值。",

  ["$thunder__yongsi1"] = "天下，即将尽归吾袁公路！",
  ["$thunder__yongsi2"] = "朕今日雄踞淮南，明日便可一匡天下。",
}

yongsi:addEffect(fk.DrawNCards, {
  anim_type = "drawcard",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(yongsi.name)
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local kingdoms = {}
    for _, p in ipairs(room.alive_players) do
      table.insertIfNeed(kingdoms, p.kingdom)
    end
    data.n = #kingdoms
  end,
})
yongsi:addEffect(fk.EventPhaseEnd, {
  anim_type = "drawcard",
  can_trigger = function(self, event, target, player, data)
    if target == player and player:hasSkill(yongsi.name) and player.phase == Player.Play then
      local n = 0
      player.room.logic:getActualDamageEvents(1, function(e)
        if e.data.from == player then
          n = n + e.data.damage
        end
      end)
      if (n == 0 and player:getHandcardNum() < player.hp) or n > 1 then
        event:setCostData(self, {extra_data = n})
        return true
      end
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local n = event:getCostData(self).extra_data
    if n == 0 and player:getHandcardNum() < player.hp then
      player:drawCards(player.hp - player:getHandcardNum(), yongsi.name)
    elseif n > 1 then
      room:addPlayerMark(player, "yongsi-turn", 1)
    end
  end,
})
yongsi:addEffect("maxcards", {
  fixed_func = function (self, player)
    if player:getMark("yongsi-turn") ~= 0 then
      return player:getLostHp()
    end
  end,
})

return yongsi
