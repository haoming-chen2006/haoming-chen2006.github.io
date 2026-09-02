local chezheng = fk.CreateSkill {
  name = "chezheng",
  tags = { Skill.Compulsory },
}

Fk:loadTranslationTable{
  ["chezheng"] = "掣政",
  [":chezheng"] = "锁定技，你的出牌阶段内，攻击范围内不包含你的其他角色不能成为你使用牌的目标。出牌阶段结束时，若你本阶段使用的牌数小于这些角色数，"..
  "你弃置其中一名角色一张牌。",

  ["#chezheng-throw"] = "掣政：选择攻击范围内不包含你的一名角色，弃置其一张牌",

  ["$chezheng1"] = "风驰电掣，政权不怠！",
  ["$chezheng2"] = "廉平掣政，实为艰事。",
}

chezheng:addEffect(fk.EventPhaseEnd, {
  anim_type = "control",
  can_trigger = function(self, event, target, player, data)
    if target == player and player:hasSkill(chezheng.name) and player.phase == Player.Play then
      local targets = table.filter(player.room:getOtherPlayers(player, false), function(p)
        return not p:inMyAttackRange(player)
      end)
      local events = player.room.logic:getEventsOfScope(GameEvent.UseCard, 999, function (e)
        local use = e.data
        return use.from == player
      end, Player.HistoryPhase)
      return #events < #targets
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local targets = table.filter(room:getOtherPlayers(player, false), function(p)
      return not p:inMyAttackRange(player) and not p:isNude()
    end)
    if #targets > 0 then
      local to = room:askToChoosePlayers(player, {
        min_num = 1,
        max_num = 1,
        targets = targets,
        skill_name = chezheng.name,
        prompt = "#chezheng-throw",
        cancelable = false,
      })[1]
      local card = room:askToChooseCard(player, {
        target = to,
        flag = "he",
        skill_name = chezheng.name,
      })
      room:throwCard(card, chezheng.name, to, player)
    end
  end,
})
chezheng:addEffect("prohibit", {
  is_prohibited = function (self, from, to, card)
    return from and from:hasSkill(chezheng.name) and card and from.phase == Player.Play and from ~= to and not to:inMyAttackRange(from)
  end,
})

return chezheng
