local fireAttack = fk.CreateSkill{
  name = "huoe__fire_attack_skill",
}

Fk:loadTranslationTable{
  ["huoe__fire_attack_skill"] = "火攻",
  ["#huoe__fire_attack_skill-discard"] = "",
}

fireAttack:addEffect("cardskill", {
  prompt = "#fire_attack_skill",
  can_use = Util.CanUse,
  target_num = 1,
  mod_target_filter = function(self, _, to_select, _, _, _)
    return not to_select:isKongcheng()
  end,
  target_filter = Util.CardTargetFilter,
  on_effect = function(self, room, effect)
    local from = effect.from
    local to = effect.to
    if to:isKongcheng() then return end

    local showCard = room:tableRandomPick(to:getCardIds("h"))
    to:showCards(showCard)

    local use = room.logic:getCurrentEvent():findParent(GameEvent.UseCard)
    if use then
      use.data.extra_data = use.data.extra_data or {}
      use.data.extra_data.huoeShowCards = use.data.extra_data.huoeShowCards or {}
      table.insertIfNeed(use.data.extra_data.huoeShowCards, showCard)
    end

    showCard = Fk:getCardById(showCard)

    local pattern = ".|.|" .. showCard:getSuitString()

    local params = { ---@type AskToDiscardParams
      min_num = 1,
      max_num = 1,
      include_equip = false,
      skill_name = fireAttack.name,
      cancelable = not table.find(from:getCardIds("h"), function(id)
        return Exppattern:Parse(pattern):match(Fk:getCardById(id)) and not from:prohibitDiscard(id)
      end),
      pattern = pattern,
      prompt = "#fire_attack-discard:" .. to.id .. "::" .. showCard:getSuitString(),
    }
    local cards = room:askToDiscard(from, params)
    if #cards == 0 and to:isAlive() and not to:isKongcheng() then
      room:viewCards(to, { cards = from:getCardIds("h"), skill_name = "huoe", prompt = "$ViewCardsFrom:" .. from.id })
    end

    if #cards > 0 and not to.dead then
      if use then
        use.data.nullifiedTargets = use.data.tos
      end

      room:damage{
        from = from,
        to = to,
        card = effect.card,
        damage = 1,
        damageType = fk.FireDamage,
        skillName = "fire_attack_skill",
      }
    end
  end,
})

return fireAttack
