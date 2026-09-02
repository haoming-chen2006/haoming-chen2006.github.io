local mouPaoxiao = fk.CreateSkill({
  name = "mou__paoxiao",
  tags = { Skill.Compulsory },
})

Fk:loadTranslationTable{
  ["mou__paoxiao"] = "咆哮",
  [":mou__paoxiao"] = "锁定技，①你使用【杀】无次数限制；"..
  "②若你装备了武器牌，你使用【杀】无距离限制；"..
  "③当你于出牌阶段使用【杀】指定目标后，若你本阶段已使用过【杀】，你令目标角色本回合非锁定技失效，" ..
  "此【杀】不能被响应且【杀】伤害值+1，此【杀】对目标角色造成伤害后若其未死亡，你失去1点体力并随机弃置一张手牌。",
  ["@@mou__paoxiao-turn"] = "咆哮封技",
  ["#mou__paoxiao_delay"] = "咆哮",

  ["$mou__paoxiao1"] = "我乃燕人张飞，尔等休走！",
  ["$mou__paoxiao2"] = "战又不战，退又不退，却是何故！",
}

mouPaoxiao:addEffect(fk.TargetSpecified, {
  anim_type = "offensive",
  can_trigger = function(self, event, target, player, data)
    return
      player:hasSkill(mouPaoxiao.name) and
      target == player and
      player.phase == Player.Play and
      data.card.trueName == "slash" and
      #player.room.logic:getEventsOfScope(GameEvent.UseCard, 2, function(e)
        return e.data.from == player and e.data.card.trueName == "slash"
      end, Player.HistoryPhase) > 1
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local to = data.to
    room:addPlayerMark(to, "@@mou__paoxiao-turn")
    room:addPlayerMark(to, MarkEnum.UncompulsoryInvalidity .. "-turn")
    data.additionalDamage = (data.additionalDamage or 0) + 1
    data.disresponsive = true
    data.extra_data = data.extra_data or {}
    data.extra_data.mou__paoxiao_user = player.id
  end,
})

mouPaoxiao:addEffect(fk.Damage, {
  is_delay_effect = true,
  mute = true,
  can_trigger = function(self, event, target, player, data)
    if not player.dead and not data.to.dead and player.room.logic:damageByCardEffect() then
      local e = player.room.logic:getCurrentEvent():findParent(GameEvent.CardEffect)
      if e then
        local use = e.data
        return (use.extra_data or {}).mou__paoxiao_user == player.id
      end
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    room:loseHp(player, 1, mouPaoxiao.name)
    local cards = table.filter(player:getCardIds("h"), function(id) return not player:prohibitDiscard(Fk:getCardById(id)) end)
    if #cards > 0 then
      room:throwCard(room:tableRandomPick(cards, 1), "mou__paoxiao", player, player)
    end
  end,
})

mouPaoxiao:addEffect("targetmod", {
  bypass_times = function(self, player, skill, scope)
    return player:hasSkill(mouPaoxiao.name) and skill.trueName == "slash_skill" and scope == Player.HistoryPhase
  end,
  bypass_distances = function(self, player, skill, card, to)
    return player:hasSkill(mouPaoxiao.name) and skill.trueName == "slash_skill" and #player:getEquipments(Card.SubtypeWeapon) > 0
  end,
})

return mouPaoxiao
