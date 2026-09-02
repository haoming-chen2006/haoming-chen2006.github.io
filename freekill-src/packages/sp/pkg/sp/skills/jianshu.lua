local jianshu = fk.CreateSkill {
  name = "jianshu",
  tags = { Skill.Limited },
}

Fk:loadTranslationTable{
  ["jianshu"] = "间书",
  [":jianshu"] = "限定技，出牌阶段，你可以将一张黑色手牌交给一名其他角色，并选择一名攻击范围内含有其的另一名角色，然后令这两名角色拼点："..
  "赢的角色弃置两张牌，没赢的角色失去1点体力。",

  ["#jianshu"] = "间书：将一张黑色手牌交给一名角色，再选择另一名角色与其拼点",
  ["#jianshu-choose"] = "间书：选择一名攻击范围内含有 %dest 的角色，两名角色拼点",

  ["$jianshu1"] = "来，让我看一出好戏吧。",
  ["$jianshu2"] = "纵有千军万马，离心则难成大事。",
}

jianshu:addEffect("active", {
  anim_type = "control",
  prompt = "#jianshu",
  card_num = 1,
  target_num = 1,
  can_use = function(self, player)
    return player:usedSkillTimes(jianshu.name, Player.HistoryGame) == 0
  end,
  card_filter = function(self, player, to_select, selected)
    return #selected == 0 and Fk:getCardById(to_select).color == Card.Black
  end,
  target_filter = function(self, player, to_select, selected)
    return #selected == 0 and to_select ~= player
  end,
  on_use = function(self, room, effect)
    local player = effect.from
    local target = effect.tos[1]
    room:obtainCard(target, Fk:getCardById(effect.cards[1]), false, fk.ReasonGive)
    if player.dead or target.dead then return end
    local targets = table.filter(room:getOtherPlayers(target, false), function (p)
      return p:inMyAttackRange(target) and target:canPindian(p)
    end)
    if #targets == 0 then return end
    local to = room:askToChoosePlayers(player, {
      targets = targets,
      min_num = 1,
      max_num = 1,
      prompt = "#jianshu-choose::"..target.id,
      skill_name = jianshu.name,
      cancelable = false,
    })[1]
    local pindian = target:pindian({to}, jianshu.name)
    if pindian.results[to].winner then
      local winner, loser
      if pindian.results[to].winner == target then
        winner = target
        loser = to
      else
        winner = to
        loser = target
      end
      if not winner.dead then
        room:askToDiscard(winner, {
          min_num = 2,
          max_num = 2,
          include_equip = true,
          skill_name = jianshu.name,
          cancelable = false,
        })
      end
      if not loser.dead then
        room:loseHp(loser, 1, jianshu.name)
      end
    else
      targets = {target, to}
      room:sortByAction(targets)
      for _, p in ipairs(targets) do
        if not p.dead then
          room:loseHp(p, 1, jianshu.name)
        end
      end
    end
  end,
})

return jianshu
