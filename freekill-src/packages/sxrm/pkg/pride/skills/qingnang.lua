local qingnang = fk.CreateSkill {
  name = "sx__qingnang",
}

Fk:loadTranslationTable{
  ["sx__qingnang"] = "青囊",
  [":sx__qingnang"] = "出牌阶段限一次，你可以弃置一张手牌并选择一名已受伤的魔关羽，然后其回复1点体力。",

  ["#sx__qingnang-active"] = "发动 青囊，弃置一张手牌并选择一名已受伤的魔关羽，其回复1点体力",
}

qingnang:addEffect("active", {
  anim_type = "support",
  prompt = "#sx__qingnang-active",
  max_phase_use_time = 1,
  card_filter = function(self, player, to_select, selected)
    return #selected == 0 and table.contains(player:getCardIds("h"), to_select) and not player:prohibitDiscard(to_select)
  end,
  target_filter = function(self, player, to_select, selected)
    return #selected == 0 and player:getMark("weiwo_owner_" .. self.name) == to_select.id and to_select:isWounded()
  end,
  target_num = 1,
  card_num = 1,
  on_use = function(self, room, effect)
    local from = effect.from
    local to = effect.tos[1]
    room:throwCard(effect.cards, qingnang.name, from, from)
    if to:isAlive() and to:isWounded() then
      room:recover({
        who = to,
        num = 1,
        recoverBy = from,
        skillName = qingnang.name,
      })
    end
  end,
})

return qingnang
