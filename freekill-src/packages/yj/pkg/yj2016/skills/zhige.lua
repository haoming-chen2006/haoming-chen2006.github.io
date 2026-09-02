local zhige = fk.CreateSkill {
  name = "zhige",
}

Fk:loadTranslationTable{
  ["zhige"] = "止戈",
  [":zhige"] = "出牌阶段限一次，若你的手牌数大于体力值，你可以令一名攻击范围包含你的其他角色选择一项：1.使用一张【杀】；"..
  "2.将装备区里的一张牌交给你。",

  ["#zhige"] = "止戈：令一名角色选择使用【杀】或交给你一张装备",
  ["#zhige-use"] = "止戈：使用一张【杀】，否则将装备区内一张牌交给 %src",
  ["#zhige-ask"] = "止戈：将装备区内一张牌交给 %src",

  ["$zhige1"] = "天下和而平乱，神器宁而止戈。",
  ["$zhige2"] = "刀兵纷争既止，国运福祚绵长。",
}

zhige:addEffect("active", {
  anim_type = "control",
  prompt = "#zhige",
  card_num = 0,
  target_num = 1,
  can_use = function(self, player)
    return player:usedSkillTimes(zhige.name) == 0 and player:getHandcardNum() > player.hp
  end,
  card_filter = Util.FalseFunc,
  target_filter = function(self, player, to_select, selected)
    return #selected == 0 and to_select:inMyAttackRange(player)
  end,
  on_use = function(self, room, effect)
    local player = effect.from
    local target = effect.tos[1]
    local use = room:askToUseCard(target, {
      skill_name = zhige.name,
      pattern = "slash",
      prompt = "#zhige-use:"..player.id,
      cancelable = true,
      extra_data = {
        bypass_times = true,
      }
    })
    if use then
      use.extraUse = true
      room:useCard(use)
    else
      if #target:getCardIds("e") > 0 then
        local card = room:askToCards(target, {
          skill_name = zhige.name,
          include_equip = true,
          min_num = 1,
          max_num = 1,
          pattern = ".|.|.|equip",
          prompt = "#zhige-ask:" .. player.id,
          cancelable = false,
        })
        room:obtainCard(player, card, true, fk.ReasonGive, target, zhige.name)
      end
    end
  end,
})

return zhige
