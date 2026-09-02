
local chixin = fk.CreateSkill {
  name = "chixin",
}

Fk:loadTranslationTable{
  ["chixin"] = "赤心",
  [":chixin"] = "你可以将<font color='red'>♦</font>牌当【杀】或【闪】使用或打出；" ..
  "你于出牌阶段内对你攻击范围内于此阶段内未成为过你使用【杀】的目标的角色使用【杀】无次数限制。",

  ["#chixin"] = "赤心：你可以将<font color='red'>♦</font>牌当【杀】或【闪】使用或打出",
}

chixin:addEffect("viewas", {
  pattern = "slash,jink",
  prompt = "#chixin",
  interaction = function(self, player)
    local all_names = {"slash", "jink"}
    local names = player:getViewAsCardNames(chixin.name, all_names)
    if #names == 0 then return end
    return UI.CardNameBox {choices = names, all_choices = all_names}
  end,
  handly_pile = true,
  filter_pattern = {
    min_num = 1,
    max_num = 1,
    pattern = ".|.|diamond"
  },
  view_as = function(self, player, cards)
    if #cards ~= 1 or self.interaction.data == nil then return end
    local card = Fk:cloneCard(self.interaction.data)
    card.skillName = chixin.name
    card:addSubcard(cards[1])
    return card
  end,
})

chixin:addEffect("targetmod", {
  bypass_times = function(self, player, skill, scope, card, to)
    return player:hasSkill(chixin.name) and skill.trueName == "slash_skill" and to and scope == Player.HistoryPhase and
      player:inMyAttackRange(to) and not table.contains(player:getTableMark("chixin_slashed-phase"), to.id)
  end
})

chixin:addEffect(fk.TargetSpecified, {
  can_refresh = function(self, event, target, player, data)
    return target == player and player:hasSkill(chixin.name) and data.card.trueName == "slash" and
      not table.contains(player:getTableMark("chixin_slashed-phase"), data.to.id)
  end,
  on_refresh = function(self, event, target, player, data)
    player.room:addTableMark(player, "chixin_slashed-phase", data.to.id)
  end,
})

chixin:addAcquireEffect(function (self, player, is_start)
  if not is_start and player.phase == Player.Play then
    local room = player.room
    local targets = {}
    room.logic:getEventsOfScope(GameEvent.UseCard, 1, function(e)
      local use = e.data
      if use.from == player and use.card.trueName == "slash" then
        for _, p in ipairs(use.tos) do
          table.insertIfNeed(targets, p.id)
        end
      end
    end, Player.HistoryPhase)
    room:setPlayerMark(player, "chixin_slashed-phase", targets)
  end
end)

return chixin
