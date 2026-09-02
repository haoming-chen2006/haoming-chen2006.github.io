local xianzhou = fk.CreateSkill {
  name = "xianzhou",
  tags = { Skill.Limited },
}

Fk:loadTranslationTable{
  ["xianzhou"] = "献州",
  [":xianzhou"] = "限定技，出牌阶段，你可以将装备区里的所有牌交给一名其他角色，然后该角色选择一项：1.令你回复X点体力；"..
  "2.对其攻击范围内的至多X名角色各造成1点伤害（X为你以此法交给该角色的牌的数量）。",

  ["#xianzhou"] = "献州：将所有装备交给一名角色，其选择令你回复体力或对其攻击范围内的角色造成伤害",
  ["#xianzhou-choose"] = "献州：对你攻击范围内的至多%arg名角色各造成1点伤害，或点“取消”令 %src 回复体力",

  ["$xianzhou1"] = "献荆襄九郡，图一世之安。",
  ["$xianzhou2"] = "丞相携天威而至，吾等安敢不降。",
}

xianzhou:addEffect("active", {
  anim_type = "control",
  prompt = "#xianzhou",
  card_num = 0,
  target_num = 1,
  can_use = function(self, player)
    return player:usedSkillTimes(xianzhou.name, Player.HistoryGame) == 0 and #player:getCardIds("e") > 0
  end,
  card_filter = Util.FalseFunc,
  target_filter = function(self, player, to_select, selected)
    return #selected == 0 and to_select ~= player
  end,
  on_use = function(self, room, effect)
    local player = effect.from
    local target = effect.tos[1]
    local n = #player:getCardIds("e")
    room:obtainCard(target, player:getCardIds("e"), false, fk.ReasonGive, player)
    if target.dead then return end
    local targets = table.filter(room:getOtherPlayers(target, false), function(p)
      return target:inMyAttackRange(p)
    end)
    local tos = {}
    if #targets > 0 then
      tos = room:askToChoosePlayers(target, {
        targets = targets,
        min_num = 1,
        max_num = n,
        prompt = "#xianzhou-choose:"..player.id.."::"..n,
        skill_name = xianzhou.name,
        cancelable = not player.dead,
      })
    end
    if #tos > 0 then
      room:sortByAction(tos)
      for _, p in ipairs(tos) do
        if not p.dead then
          room:damage{
            from = target,
            to = p,
            damage = 1,
            skillName = xianzhou.name,
          }
        end
      end
    else
    if player:isWounded() then
        room:recover{
          who = player,
          num = math.min(n, player.maxHp - player.hp),
          recoverBy = target,
          skillName = xianzhou.name,
        }
      end
    end
  end,
})

return xianzhou
