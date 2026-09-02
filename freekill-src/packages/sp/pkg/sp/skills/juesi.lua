local juesi = fk.CreateSkill {
  name = "juesi",
}

Fk:loadTranslationTable{
  ["juesi"] = "决死",
  [":juesi"] = "出牌阶段，你可以弃置一张【杀】并选择攻击范围内的一名其他角色，然后令该角色弃置一张牌。若该角色弃置的牌不为【杀】且"..
  "其体力值不小于你，你视为对其使用一张【决斗】。",

  ["#juesi"] = "决死：弃置一张【杀】，令一名角色弃一张牌",
  ["#juesi-discard"] = "决死：你需弃置一张牌，若不为【杀】且你体力值不小于 %src，视为其对你使用【决斗】",

  ["$juesi1"] = "死都不怕，还能怕你！",
  ["$juesi2"] = "抬棺而战，不死不休！",
}

juesi:addEffect("active", {
  anim_type = "offensive",
  prompt = "#juesi",
  card_num = 1,
  target_num = 1,
  card_filter = function(self, player, to_select, selected)
    return #selected == 0 and Fk:getCardById(to_select).trueName == "slash" and not player:prohibitDiscard(to_select)
  end,
  target_filter = function(self, player, to_select, selected)
    return #selected == 0 and not to_select:isNude() and player:inMyAttackRange(to_select)
  end,
  on_use = function(self, room, effect)
    local player = effect.from
    local target = effect.tos[1]
    room:throwCard(effect.cards, juesi.name, player, player)
    if target.dead then return end
    local card = room:askToDiscard(target, {
      min_num = 1,
      max_num = 1,
      include_equip = true,
      skill_name = juesi.name,
      prompt = "#juesi-discard:"..player.id,
      cancelable = false,
      skip = true,
    })
    if #card > 0 then
      card = Fk:getCardById(card[1])
      room:throwCard(card, juesi.name, target, target)
      if card.trueName ~= "slash" and target.hp >= player.hp and
        not player.dead and not target.dead then
        room:useVirtualCard("duel", nil, player, target, juesi.name)
      end
    end
  end,
})

return juesi
