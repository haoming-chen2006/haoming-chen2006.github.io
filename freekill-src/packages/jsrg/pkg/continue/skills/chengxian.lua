local chengxian = fk.CreateSkill {
  name = "chengxian",
}

Fk:loadTranslationTable{
  ["chengxian"] = "称贤",
  [":chengxian"] = "出牌阶段限两次，你可以将一张手牌当一张本回合未以此法使用过的普通锦囊牌使用"..
  "（转化后的牌须与用于转化的牌的合法目标角色数相等）。",

  ["#chengxian"] = "称贤：将一张手牌当普通锦囊牌使用（两者必须合法目标数相同）",

  ["$chengxian1"] = "所愿广求淑媛，以丰继嗣。",
  ["$chengxian2"] = "贤妻夫祸少，夫宽妻多福。",
}

local function getTargetsNum(player, card)
  if player:prohibitUse(card) or not player:canUse(card) then return 0 end
  if card.skill:getMinTargetNum() == 0 and not card.multiple_targets then
    return 1
  else
    local x = 0
    for _, p in ipairs(Fk:currentRoom().alive_players) do
      if not player:isProhibited(p, card) and card.skill:modTargetFilter(player, p, {}, card) then
        x = x + 1
      end
    end
    return x
  end
end

chengxian:addEffect("viewas", {
  prompt = "#chengxian",
  times = function(self, player)
    if player.phase == Player.Play then
      return 2 + player:getMark("chengxian_extratimes-phase") - player:usedSkillTimes(chengxian.name, Player.HistoryPhase)
    end
    return -1
  end,
  interaction = function(self, player)
    local all_names = Fk:getAllCardNames("t")
    local names = player:getViewAsCardNames(chengxian.name, all_names, nil, player:getTableMark("chengxian-turn"))
    names = table.filter(names, function(name)
      return table.find(player:getHandlyIds(), function (id)
        local card = Fk:cloneCard(name)
        card:addSubcard(id)
        card.skillName = chengxian.name
        local x = getTargetsNum(player, card)
        return x > 0 and x == getTargetsNum(player, Fk:getCardById(id))
      end) ~= nil
    end)
    if #names > 0 then
      return UI.CardNameBox { choices = names, all_choices = all_names }
    end
  end,
  handly_pile = true,
  card_filter = function(self, player, to_select, selected)
    if self.interaction.data == nil or #selected > 0 or not table.contains(player:getHandlyIds(), to_select) then return end
    local card = Fk:cloneCard(self.interaction.data)
    card:addSubcard(to_select)
    card.skillName = chengxian.name
    return getTargetsNum(player, card) == getTargetsNum(player, Fk:getCardById(to_select))
  end,
  view_as = function(self, player, cards)
    if #cards ~= 1 or not self.interaction.data then return nil end
    local card = Fk:cloneCard(self.interaction.data)
    card:addSubcard(cards[1])
    card.skillName = chengxian.name
    return card
  end,
  before_use = function(self, player, use)
    player.room:addTableMark(player, "chengxian-turn", use.card.trueName)
  end,
  enabled_at_play = function(self, player)
    return player:usedSkillTimes(chengxian.name, Player.HistoryPhase) < 2 + player:getMark("chengxian_extratimes-phase")
  end,
})

chengxian:addLoseEffect(function (self, player, is_death)
  local room = player.room
  room:setPlayerMark(player, "chengxian_extratimes-phase", 0)
  room:setPlayerMark(player, "chengxian-turn", 0)
end)

return chengxian
