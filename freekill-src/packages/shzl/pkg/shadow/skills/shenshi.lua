local shenshi = fk.CreateSkill {
  name = "shenshi",
  tags = {Skill.Switch},
}

Fk:loadTranslationTable{
  ["shenshi"] = "审时",
  [":shenshi"] = "转换技，阳：出牌阶段限一次，你可以交给手牌数最多的其他角色一张牌，并对其造成1点伤害，若其死亡，你可以令一名角色将手牌摸至四张。"..
  "阴：当有手牌的其他角色对你造成伤害后，你可以观看其手牌，并交给其一张牌；当前回合结束阶段，若此牌仍在其手牌或装备区，你将手牌摸至四张。",

  [":shenshi_yang"] = "转换技，<font color=\"#E0DB2F\">阳：出牌阶段限一次，你可以交给手牌数最多的其他角色一张牌，并对其造成1点伤害，" ..
  "若其死亡，你可以令一名角色将手牌摸至四张。</font>阴：当有手牌的其他角色对你造成伤害后，你可以观看其手牌，并交给其一张牌；当前回合结束阶段，" ..
  "若此牌仍在其手牌或装备区，你将手牌摸至四张。",
  [":shenshi_yin"] = "转换技，阳：出牌阶段限一次，你可以交给手牌数最多的其他角色一张牌，并对其造成1点伤害，若其死亡，你可以令一名角色"..
  "将手牌摸至四张。<font color=\"#E0DB2F\">阴：当有手牌的其他角色对你造成伤害后，你可以观看其手牌，并交给其一张牌；当前回合结束阶段，"..
  "若此牌仍在其手牌或装备区，你将手牌摸至四张。</font>",

  ["#shenshi"] = "审时：交给手牌数最多的其他角色一张牌，并对其造成1点伤害",
  ["#shenshi-choose"] = "审时：你可以令一名角色将手牌摸至四张",
  ["#shenshi-invoke"] = "审时：你可以观看 %dest 的手牌并交给其一张牌",
  ["#shenshi-give"] = "审时：交给 %dest 一张牌，若本回合结束阶段仍属于其，你将手牌摸至四张",
  ["#shenshiYin"] = "审时",

  ["$shenshi1"] = "深中足智，鉴时审情。",
  ["$shenshi2"] = "数语之言，审时度势。",
}

shenshi:addEffect("active", {
  anim_type = "switch",
  card_num = 1,
  target_num = 1,
  prompt = "#shenshi",
  can_use = function(self, player)
    return player:usedEffectTimes(self.name, Player.HistoryPhase) == 0 and
      player:getSwitchSkillState(shenshi.name, false) == fk.SwitchYang
  end,
  card_filter = function(self, player, to_select, selected)
    return #selected == 0
  end,
  target_filter = function (self, player, to_select, selected)
    if #selected == 0 and to_select ~= player then
      local n = 0
      for _, p in ipairs(Fk:currentRoom().alive_players) do
        if p ~= player and p:getHandcardNum() > n then
          n = p:getHandcardNum()
        end
      end
      return to_select:getHandcardNum() == n
    end
  end,
  on_use = function(self, room, effect)
    local player = effect.from
    local target = effect.tos[1]
    room:obtainCard(target, effect.cards[1], true, fk.ReasonGive, player, shenshi.name)
    room:damage{
      from = player,
      to = target,
      damage = 1,
      skillName = shenshi.name,
    }
    if target.dead and not player.dead then
      local targets = table.filter(room.alive_players, function(p)
        return p:getHandcardNum() < 4
      end)
      if #targets == 0 then return end
      local to = room:askToChoosePlayers(player, {
        min_num = 1,
        max_num = 1,
        targets = targets,
        skill_name = shenshi.name,
        prompt = "#shenshi-choose",
        cancelable = true,
      })
      if #to > 0 then
        to[1]:drawCards(4 - to[1]:getHandcardNum(), shenshi.name)
      end
    end
  end,
})
shenshi:addEffect(fk.Damaged, {
  anim_type = "switch",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(shenshi.name) and
      player:getSwitchSkillState(shenshi.name, false) == fk.SwitchYin and
      data.from and data.from ~= player and not data.from.dead and not data.from:isKongcheng()
  end,
  on_cost = function(self, event, target, player, data)
    if player.room:askToSkillInvoke(player, {
      skill_name = shenshi.name,
      prompt = "#shenshi-invoke::"..data.from.id,
    }) then
      event:setCostData(self, {tos = {data.from}})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    if not data.from:isKongcheng() then
      room:viewCards(player, { cards = data.from:getCardIds("h"), skill_name = shenshi.name, prompt = "$ViewCardsFrom:"..data.from.id })
    end
    if player:isNude() then return end
    local card = room:askToCards(player, {
      min_num = 1,
      max_num = 1,
      include_equip = true,
      skill_name = shenshi.name,
      prompt = "#shenshi-give::"..data.from.id,
      cancelable = false,
    })
    room:addTableMark(player, "shenshi-turn", {data.from.id, card[1]})
    room:obtainCard(data.from, card, false, fk.ReasonGive, player, shenshi.name)
  end,
})
shenshi:addEffect(fk.EventPhaseStart, {
  anim_type = "drawcard",
  is_delay_effect = true,
  can_trigger = function(self, event, target, player, data)
    if target.phase == Player.Finish and player:getMark("shenshi-turn") ~= 0 and player:getHandcardNum() < 4 then
      for _, t in ipairs(player:getMark("shenshi-turn")) do
        local p = player.room:getPlayerById(t[1])
        if p and table.contains(p:getCardIds("he"), t[2]) then
          return true
        end
      end
    end
  end,
  on_use = function(self, event, target, player, data)
    player:drawCards(4 - player:getHandcardNum(), shenshi.name)
  end,
})

return shenshi
