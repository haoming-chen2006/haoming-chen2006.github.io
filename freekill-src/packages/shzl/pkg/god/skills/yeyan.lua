local yeyan = fk.CreateSkill {
  name = "yeyan",
  tags = {Skill.Limited},
}

Fk:loadTranslationTable{
  ["yeyan"] = "业炎",
  [":yeyan"] = "限定技，出牌阶段，你可以指定一至三名角色，你分别对这些角色造成至多共计3点火焰伤害；若你对一名角色分配2点或更多的火焰伤害，"..
  "你须先弃置四张不同花色的手牌并失去3点体力。",

  ["small_yeyan"] = "1点伤害",
  ["middle_yeyan"] = "2点伤害",
  ["great_yeyan"] = "3点伤害",

  ["#yeyan-great"] = "业炎：弃置四张不同花色的手牌并选择一名角色，对其造成3点火焰伤害",
  ["#yeyan-middle"] = "业炎：选择四张不同花色的手牌弃置",
  ["#yeyan-middle-choose"] = "业炎：选择1-2名角色，对第一名角色造成2点火焰伤害，第二名角色造成1点火焰伤害",
  ["#yeyan-small"] = "业炎：选择1-3名角色，对这些角色各造成1点火焰伤害",

  ["$yeyan1"] = "（燃烧声）聆听吧，这献给你的镇魂曲！",
  ["$yeyan2"] = "（燃烧声）让这熊熊业火，焚尽你的罪恶！",
}

yeyan:addEffect("active", {
  anim_type = "offensive",
  min_target_num = 1,
  max_target_num = 3,
  min_card_num = 0,
  max_card_num = 4,
  prompt = function(self, pplayer, selected_cards)
    local yeyan_type = self.interaction.data
    if yeyan_type == "great_yeyan" then
      return "#yeyan-great"
    elseif yeyan_type == "middle_yeyan" then
      if #selected_cards ~= 4 then
        return "#yeyan-middle"
      else
        return "#yeyan-middle-choose"
      end
    else
      return "#yeyan-small"
    end
  end,
  interaction = UI.ComboBox { choices = {"small_yeyan", "middle_yeyan", "great_yeyan"} },
  target_tip = function(self, to_select, selected, selected_cards, card, selectable, extra_data)
    if not selectable then return end
    if #selected == 0 then
      return { {content = self.interaction.data, type = "normal"} }
    else
      if to_select == selected[1] then
        return { {content = self.interaction.data, type = "warning"} }
      elseif table.contains(selected, to_select) then
        return { {content = "small_yeyan", type = "warning"} }
      else
        return { {content = "small_yeyan", type = "normal"} }
      end
    end
  end,
  can_use = function(self, player)
    return player:usedSkillTimes(yeyan.name, Player.HistoryGame) == 0
  end,
  card_filter = function(self, player, to_select, selected)
    return self.interaction.data ~= "small_yeyan" and #selected < 4 and
      table.contains(player:getCardIds("h"), to_select) and not player:prohibitDiscard(to_select) and
      table.every(selected, function (id)
      return Fk:getCardById(to_select):compareSuitWith(Fk:getCardById(id), true)
    end)
  end,
  target_filter = function(self, player, to_select, selected, selected_cards)
    if self.interaction.data == "small_yeyan" then
      return #selected_cards == 0 and #selected < 3
    elseif self.interaction.data == "middle_yeyan" then
      return #selected_cards == 4 and #selected < 2
    else
      return #selected_cards == 4 and #selected == 0
    end
  end,
  on_use = function(self, room, effect)
    local player = effect.from
    local first = effect.tos[1]
    local max_damage = 1
    if effect.interaction_data == "middle_yeyan" then
      max_damage = 2
    elseif effect.interaction_data == "great_yeyan" then
      max_damage = 3
    end
    room:sortByAction(effect.tos)
    if #effect.cards > 0 then
      room:throwCard(effect.cards, yeyan.name, player, player)
    end
    if max_damage > 1 and not player.dead then
      room:loseHp(player, 3, yeyan.name)
    end
    for _, p in ipairs(effect.tos) do
      if not p.dead then
        room:damage{
          from = player,
          to = p,
          damage = (p == first) and max_damage or 1,
          damageType = fk.FireDamage,
          skillName = yeyan.name,
        }
      end
    end
  end,
})

return yeyan
