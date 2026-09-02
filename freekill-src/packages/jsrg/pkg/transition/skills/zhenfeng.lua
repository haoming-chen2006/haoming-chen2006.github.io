local zhenfeng = fk.CreateSkill {
  name = "zhenfeng",
}

Fk:loadTranslationTable{
  ["zhenfeng"] = "针锋",
  [":zhenfeng"] = "出牌阶段每种类别的牌限一次，你可以视为使用一张存活角色技能描述中包含的牌（无距离次数限制且须为基本牌或普通锦囊牌），\
  当此牌对该角色生效后，你对其造成1点伤害。",

  ["#zhenfeng"] = "针锋：你可以视为使用一种场上角色技能描述中包含的牌",
}

zhenfeng:addEffect("viewas", {
  prompt = "#zhenfeng",
  interaction = function(self, player)
    local all_names = {}
    for _, card in pairs(Fk.all_card_types) do
      if (card.type == Card.TypeBasic or card:isCommonTrick()) and
        not table.contains(all_names, card.name) then
        for _, p in ipairs(Fk:currentRoom().alive_players) do
          for _, s in ipairs(p:getSkillNameList()) do
            local desc = Fk:translate(":"..s, "zh_CN")
            if string.find(desc, "【"..Fk:translate(card.name, "zh_CN").."】") or
              string.find(desc, Fk:translate(card.name, "zh_CN")[1].."【"..Fk:translate(card.trueName, "zh_CN").."】") then
              table.insert(all_names, card.name)
            end
          end
        end
      end
    end
    local names = {}
    for _, name in ipairs(all_names) do
      local card = Fk:cloneCard(name)
      card.skillName = zhenfeng.name
      if not table.contains(player:getTableMark("zhenfeng-phase"), card:getTypeString()) and
        player:canUse(card) and not player:prohibitUse(card) then
        table.insert(names, name)
      end
    end
    return UI.CardNameBox { choices = names, all_choices = all_names }
  end,
  card_filter = Util.FalseFunc,
  view_as = function(self, player, cards)
    if self.interaction.data == nil then return end
    local card = Fk:cloneCard(self.interaction.data)
    card.skillName = zhenfeng.name
    return card
  end,
  before_use = function(self, player, use)
    use.extraUse = true
    player.room:addTableMark(player, "zhenfeng-phase", use.card:getTypeString())
  end,
  enabled_at_play = function(self, player)
    return #player:getTableMark("zhenfeng-phase") < 2
  end,
})

zhenfeng:addEffect("targetmod", {
  bypass_distances = function(self, player, skill, card)
    return card and table.contains(card.skillNames, zhenfeng.name)
  end,
  bypass_times = function(self, player, skill, scope, card)
    return card and table.contains(card.skillNames, zhenfeng.name)
  end,
})

zhenfeng:addEffect(fk.CardEffectFinished, {
  anim_type = "offensive",
  is_delay_effect = true,
  can_trigger = function(self, event, target, player, data)
    if data.from == player and table.contains(data.card.skillNames, zhenfeng.name) and
      data.to and not data.to.dead and not player.dead and
      not data.isCancellOut and not data.nullified and not table.contains(data.use.nullifiedTargets or {}, data.to) then
      for _, s in ipairs(data.to:getSkillNameList()) do
        local desc = Fk:translate(":"..s, "zh_CN")
        if string.find(desc, "【"..Fk:translate(data.card.name, "zh_CN").."】") or
          string.find(desc, Fk:translate(data.card.name, "zh_CN")[1].."【"..Fk:translate(data.card.trueName, "zh_CN").."】") then
          return true
        end
      end
    end
  end,
  on_cost = function (self, event, target, player, data)
    event:setCostData(self, {tos = {data.to}})
    return true
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    room:damage{
      from = player,
      to = data.to,
      damage = 1,
      skillName = zhenfeng.name,
    }
  end,
})

zhenfeng:addLoseEffect(function (self, player, is_death)
  player.room:setPlayerMark(player, "zhenfeng-phase", 0)
end)

return zhenfeng
